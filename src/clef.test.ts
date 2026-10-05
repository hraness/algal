import { describe, expect, test } from "bun:test";
import { clefAsker, clefEndpoint, clefExecutor, parseClefResponse, validateClefImages } from "./clef";
import { effectRequestDigest, replayExecutor, type EffectRequest } from "./effects";
import { resolveCredential } from "./credentials";

const accountId = "a".repeat(32);
const credential = "fake-cloudflare-token";
const questions = { keep: { type: "noul" as const, instructions: "Keep this?" } };
const result = { model: "clef", answers: { keep: { type: "noul" as const, noul: 0.8 } }, usage: { input_tokens: 12, output_tokens: 0 } };
const image = { content_type: "image/png" as const, base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1ioAAAAASUVORK5CYII=" };

describe("Cloudflare Clef", () => {
  test("captures fixed-origin REST requests and unwraps matched answers", async () => {
    const asker = clefAsker({ accountId, credential, fetch: async (url, init) => {
      expect(url).toBe(clefEndpoint(accountId, "clef"));
      expect(init?.redirect).toBe("error");
      expect(init?.headers).toMatchObject({ authorization: `Bearer ${credential}` });
      expect(JSON.parse(String(init?.body))).toEqual({ model: "clef", state: { text: "state" }, questions, images: [image] });
      return Response.json({ success: true, result, errors: [], messages: [] });
    }});
    expect(await asker.ask({ text: "state" }, questions, undefined, [image])).toEqual({ answers: result.answers, usage: { model: "clef", tokensIn: 12, tokensOut: 0 } });
    expect(() => clefEndpoint("../other", "clef")).toThrow();
    expect(() => clefAsker({ accountId, credential, baseUrl: "https://evil.example" })).toThrow();
    expect(() => clefAsker({ accountId, credential, baseUrl: `${clefEndpoint(accountId, "clef")}?redirect=other` })).toThrow();
    expect(() => clefAsker({ accountId, credential, baseUrl: clefEndpoint(accountId, "clef-flash") })).toThrow();
    expect(() => clefAsker({ accountId, credential, maxResponseBytes: 0 })).toThrow();
  });

  test("preserves score legends, validates probability mass and question correspondence", () => {
    const qs = { label: { type: "choice" as const, instructions: "Choose", criteria: { yes: null, no: null } }, rate: { type: "score" as const, instructions: "Rate", criteria: ["low", "high"] } };
    const value = { model: "clef", usage: result.usage, answers: { label: { type: "choice", choice: "yes", confidence: 0.9, probabilities: { yes: 0.9, no: 0.1 } }, rate: { type: "score", score: 0.7, confidence: 0.7, probabilities: { "0": 0.3, "1": 0.7 }, legend: { "0": "low", "1": "high" } } } };
    expect(parseClefResponse({ success: true, result: value }, "clef", qs).answers.rate).toMatchObject({ legend: { "0": "low", "1": "high" } });
    for (const bad of [
      { ...value, model: "clef-flash" }, { ...value, usage: { input_tokens: -1, output_tokens: 0 } },
      { ...value, answers: {} }, { ...value, answers: { ...value.answers, extra: result.answers.keep } },
      { ...value, answers: { ...value.answers, label: { ...value.answers.label, confidence: 2 } } },
      { ...value, answers: { ...value.answers, label: { ...value.answers.label, choice: "other" } } },
      { ...value, answers: { ...value.answers, label: { ...value.answers.label, probabilities: { yes: 0.8, no: 0.1 } } } },
      { ...value, answers: { ...value.answers, rate: { ...value.answers.rate, legend: { "0": "wrong", "1": "high" } } } },
    ]) expect(() => parseClefResponse({ success: true, result: bad }, "clef", qs)).toThrow("Invalid Cloudflare Clef response");
    expect(() => parseClefResponse({ success: false, result, errors: [{ message: "PRIVATE" }] }, "clef", questions)).toThrow("Invalid Cloudflare Clef response");
    expect(() => parseClefResponse(result, "clef", questions)).toThrow();
  });

  test("accepts recorded synthetic Clef score rounding without accepting inconsistent scores", () => {
    const qs = { severity: { type: "score" as const, instructions: "How severe is the customer impact?", criteria: ["No impact", "Minor", "Major", "Critical"] } };
    for (const sample of [
      { model: "clef" as const, score: 2.931, confidence: 0.8612, probabilities: { "0": 0.0047, "1": 0.0051, "2": 0.0448, "3": 0.9454 } },
      { model: "clef-flash" as const, score: 2.7378, confidence: 0.5316, probabilities: { "0": 0.0149, "1": 0.0157, "2": 0.186, "3": 0.7834 } },
    ]) {
      const answer = { type: "score" as const, score: sample.score, confidence: sample.confidence, probabilities: sample.probabilities, legend: { "0": "No impact", "1": "Minor", "2": "Major", "3": "Critical" } };
      const envelope = { success: true, result: { model: sample.model, usage: { input_tokens: 319, output_tokens: 0 }, answers: { severity: answer } } };
      expect(parseClefResponse(envelope, sample.model, qs).answers.severity).toEqual(answer);
      expect(() => parseClefResponse({ ...envelope, result: { ...envelope.result, answers: { severity: { ...answer, score: sample.score - 0.01 } } } }, sample.model, qs)).toThrow("Invalid Cloudflare Clef response");
    }
  });

  test("requires a normalized distribution within individual rounding intervals", () => {
    const qs = { label: { type: "choice" as const, instructions: "Choose", criteria: { a: null, b: null, c: null } } };
    const envelope = (p: number) => ({ success: true, result: { model: "clef", usage: result.usage, answers: { label: { type: "choice", choice: "a", confidence: 0.2, probabilities: { a: p, b: p, c: p } } } } });
    expect(parseClefResponse(envelope(0.333), "clef", qs).answers.label).toMatchObject({ choice: "a" });
    for (const p of [0, 0.332, 0.334]) expect(() => parseClefResponse(envelope(p), "clef", qs)).toThrow("Invalid Cloudflare Clef response");
  });

  test("rejects bad images and questions before credentials or provider access", async () => {
    let calls = 0;
    const asker = clefAsker({ accountId, credential: async () => { calls++; return credential; }, fetch: async () => { calls++; return Response.json({}); } });
    for (const images of [["https://example.com/a.png"], [{ ...image, base64: "broken" }], [{ ...image, content_type: "image/svg+xml" }], Array(5).fill(image), [{ ...image, base64: Buffer.alloc(4 * 1024 * 1024 + 1).toString("base64") }]]) {
      await expect(asker.ask({}, questions, undefined, images)).rejects.toThrow();
    }
    for (const qs of [{ "bad id": questions.keep }, { keep: { ...questions.keep, instructions: " " } }, { q: { type: "choice" as const, instructions: "choose", criteria: { one: null } } }]) await expect(asker.ask({}, qs)).rejects.toThrow();
    const bomb = Buffer.from(image.base64, "base64"); bomb.writeUInt32BE(4001, 16); bomb.writeUInt32BE(4001, 20);
    expect(() => validateClefImages([{ ...image, base64: bomb.toString("base64") }])).toThrow();
    expect(calls).toBe(0);
  });

  test("images survive the decision executor and affect its private configuration identity", async () => {
    const request: EffectRequest = { contract: "algal.effect.v1", cellId: "q", kind: "decide", prompt: "Evaluate", context: {}, output: { kind: "json", schema: {} }, budget: { maxContextBytes: 4096, maxOutputBytes: 4096 }, questions, images: [image] };
    const executor = clefExecutor({ accountId, credential, fetch: async (_url, init) => { expect(JSON.parse(String(init?.body)).images).toEqual([image]); return Response.json({ success: true, result }); } });
    expect(executor.id).toBe("clef");
    expect((await executor.execute(request) as { answers: unknown }).answers).toEqual(result.answers);
    await expect(executor.execute({ ...request, kind: "gate" })).rejects.toThrow();
    await expect(executor.execute({ ...request, kind: "agent" })).rejects.toThrow();
    expect(clefExecutor({ accountId, credential: "another-fake-token" }).cacheIdentity).toBe(executor.cacheIdentity);
    expect(clefExecutor({ accountId, credential, model: "clef-flash" }).id).toBe("clef:clef-flash");
  });

  test("configured images cannot be silently dropped by a custom asker", () => {
    let calls = 0;
    const asker = { async ask() { calls++; return { answers: result.answers }; } };
    expect(() => clefExecutor({ accountId, images: [image], asker })).toThrow("custom asker cannot configure images");
    expect(calls).toBe(0);
  });

  test("image bytes bind replay; Clef and historical Jev receipts replay offline", async () => {
    const request: EffectRequest = { contract: "algal.effect.v1", cellId: "q", kind: "decide", prompt: "Evaluate", context: {}, output: { kind: "json", schema: {} }, budget: { maxContextBytes: 4096, maxOutputBytes: 4096 }, questions, images: [image] };
    const requestDigest = effectRequestDigest(request);
    expect(requestDigest).not.toBe(effectRequestDigest({ ...request, images: [] }));
    for (const executor of ["clef", "jev"]) {
      const output = { answers: result.answers };
      const replay = replayExecutor([{ requestDigest, output, executor, usage: { model: executor === "clef" ? "clef" : "jev-latest", tokensIn: 12, tokensOut: 0 } }]);
      expect(await replay.execute(request)).toEqual(output);
    }
  });

  test("aggregate bytes and JPEG/WebP container dimensions are checked", () => {
    const png = Buffer.from(image.base64, "base64");
    const filler = Buffer.alloc(4 * 1024 * 1024 - png.length);
    filler.writeUInt32BE(filler.length - 12, 0); filler.write("tEXt", 4);
    const large = { ...image, base64: Buffer.concat([png.subarray(0, 33), filler, png.subarray(33)]).toString("base64") };
    expect(validateClefImages([large, large])).toHaveLength(2);
    expect(() => validateClefImages([large, large, image])).toThrow();
    const jpeg = Buffer.from([255,216,255,192,0,11,8,0,1,0,1,1,1,17,0,255,218,0,8,1,1,0,0,63,0,1,255,217]);
    expect(validateClefImages([{ content_type: "image/jpeg", base64: jpeg.toString("base64") }])).toHaveLength(1);
    expect(() => validateClefImages([{ content_type: "image/png", base64: jpeg.toString("base64") }])).toThrow();
    jpeg.writeUInt16BE(4001, 7); jpeg.writeUInt16BE(4001, 9);
    expect(() => validateClefImages([{ content_type: "image/jpeg", base64: jpeg.toString("base64") }])).toThrow();
    const webp = Buffer.from("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA", "base64");
    expect(validateClefImages([{ content_type: "image/webp", base64: webp.toString("base64") }])).toHaveLength(1);
    webp.writeUInt16LE(4001, 26); webp.writeUInt16LE(4001, 28);
    expect(() => validateClefImages([{ content_type: "image/webp", base64: webp.toString("base64") }])).toThrow();
  });

  test("truncated or header-only containers fail before credential resolution", async () => {
    const png = Buffer.from(image.base64, "base64");
    const webp = Buffer.alloc(30); webp.write("RIFF", 0); webp.writeUInt32LE(22, 4); webp.write("WEBPVP8X", 8); webp.writeUInt32LE(10, 16);
    const invalid = [
      { ...image, base64: png.subarray(0, 33).toString("base64") },
      { ...image, base64: png.subarray(0, -1).toString("base64") },
      { ...image, base64: Buffer.concat([png, Buffer.from([0])]).toString("base64") },
      { content_type: "image/jpeg", base64: Buffer.from([255,216,255,192,0,8,8,0,1,0,1,1,255,217]).toString("base64") },
      { content_type: "image/webp", base64: webp.toString("base64") },
    ];
    let resolutions = 0, dispatches = 0;
    const asker = clefAsker({ accountId, credential: async () => { resolutions++; return credential; }, fetch: async () => { dispatches++; return Response.json({}); } });
    for (const value of invalid) await expect(asker.ask({}, questions, undefined, [value])).rejects.toThrow("Invalid Clef image");
    expect(resolutions).toBe(0); expect(dispatches).toBe(0);
  });

  test("configured images bind the request, receipt and cache without accepting a second source", async () => {
    let calls = 0;
    const executor = clefExecutor({ accountId, credential, images: [image], fetch: async (_url, init) => { calls++; expect(JSON.parse(String(init?.body)).images).toEqual([image]); return Response.json({ success: true, result }); } });
    const request: EffectRequest = { contract: "algal.effect.v1", cellId: "q", kind: "decide", prompt: "Evaluate", context: {}, output: { kind: "json", schema: {} }, budget: { maxContextBytes: 4096, maxOutputBytes: 4096 }, questions };
    await executor.execute(request);
    expect(executor.cacheIdentity).not.toBe(clefExecutor({ accountId, credential }).cacheIdentity);
    expect(await executor.receiptFor?.(request)).not.toEqual(await clefExecutor({ accountId, credential }).receiptFor?.(request));
    await expect(executor.execute({ ...request, images: [] })).rejects.toThrow("images must have one source");
    expect(calls).toBe(1);
  });

  test("legacy TypeSafe environment values are never Clef credentials", async () => {
    const saved = { ...process.env };
    try {
      delete process.env.CLOUDFLARE_API_TOKEN; delete process.env.CLOUDFLARE_AUTH_TOKEN;
      process.env.TYPESAFE_API_KEY = "legacy-private-token";
      expect(await resolveCredential("clef")).toBeUndefined();
      process.env.CLOUDFLARE_AUTH_TOKEN = credential;
      expect(await resolveCredential("clef")).toEqual({ key: credential, source: "env" });
      process.env.CLOUDFLARE_API_TOKEN = "canonical-fake-token";
      expect((await resolveCredential("clef"))?.key).toBe("canonical-fake-token");
    } finally { process.env = saved; }
  });

  test("question byte limits reject oversized Unicode before dispatch", async () => {
    const asker = clefAsker({ accountId, credential, fetch: async () => { throw new Error("must not dispatch"); } });
    await expect(asker.ask({}, { keep: { type: "noul", instructions: "😀".repeat(1100) } })).rejects.toMatchObject({ code: "PARSE_FAILED", uncertain: false });
  });

  test("cancellation, transport uncertainty and error privacy remain intact", async () => {
    let calls = 0;
    const controller = new AbortController(); controller.abort();
    const asker = clefAsker({ accountId, credential: async () => { calls++; return credential; } });
    await expect(asker.ask({}, questions, controller.signal)).rejects.toMatchObject({ uncertain: false });
    expect(calls).toBe(0);
    const failed = clefAsker({ accountId, credential, fetch: async () => { throw new Error("PRIVATE"); } });
    await expect(failed.ask({}, questions)).rejects.toMatchObject({ uncertain: true });
    const denied = clefAsker({ accountId, credential, fetch: async () => new Response("PRIVATE", { status: 401 }) });
    await expect(denied.ask({}, questions)).rejects.toThrow("body withheld");
    const limited = clefAsker({ accountId, credential, maxResponseBytes: 32, fetch: async () => new Response("x".repeat(33)) });
    await expect(limited.ask({}, questions)).rejects.toMatchObject({ uncertain: true });
    const redirect = clefAsker({ accountId, credential, fetch: async () => new Response("PRIVATE", { status: 302 }) });
    await expect(redirect.ask({}, questions)).rejects.toMatchObject({ code: "EFFECT_FAILED", uncertain: false });
  });
});
