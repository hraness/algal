import { describe, expect, test } from "bun:test";
import { jevAsker, jevExecutor, TYPESAFE_SYSTEMONE_URL } from "./jev";
import type { EffectRequest } from "./effects";
import { AlgalError } from "./errors";
import { canonicalize, type JsonObject, type JsonValue } from "./values";

const KEY = "ts_test_key_abcdef1234";

function fakeFetch(handler: (url: string, init: RequestInit) => unknown): typeof fetch {
  return (async (input: Request | string | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const body = handler(url, init ?? {});
    return new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
}

describe("jevAsker", () => {
  test("posts model+state+questions to systemone with bearer auth", async () => {
    let seen: { url: string; auth: string | null; body: JsonObject } | undefined;
    const asker = jevAsker({
      credential: KEY,
      fetch: fakeFetch((url, init) => {
        seen = {
          url,
          auth: (init.headers as Record<string, string>).authorization ?? null,
          body: JSON.parse(String(init.body)) as JsonObject,
        };
        return {
          model: "jev-latest",
          answers: { q1: { noul: 0.61 } },
          usage: { input_tokens: 100, output_tokens: 3 },
        };
      }),
    });
    const res = await asker.ask(
      { note: "the state" },
      { q1: { type: "noul", instructions: "relevant?" } },
    );
    expect(seen!.url).toBe(TYPESAFE_SYSTEMONE_URL);
    expect(seen!.auth).toBe(`Bearer ${KEY}`);
    expect(seen!.body.model).toBe("jev-latest");
    expect((seen!.body.questions as JsonObject).q1).toBeDefined();
    expect((res.answers.q1 as { noul: number }).noul).toBe(0.61);
    expect(res.usage?.tokensIn).toBe(100);
  });

  test("credential resolver is awaited; missing key is a typed error", async () => {
    const asker = jevAsker({ credential: async () => "" });
    await expect(
      asker.ask({}, { q: { type: "noul", instructions: "i" } }),
    ).rejects.toThrow(AlgalError);
    try {
      await asker.ask({}, { q: { type: "noul", instructions: "i" } });
    } catch (e) {
      expect((e as AlgalError).code).toBe("EFFECT_UNBOUND");
      expect((e as AlgalError).message).not.toContain(KEY);
    }
  });

  test("http errors withhold the body and never echo the key", async () => {
    const asker = jevAsker({
      credential: KEY,
      fetch: (async () =>
        new Response(`{"error":"bad key ${KEY}"}`, { status: 401 })) as unknown as typeof fetch,
    });
    try {
      await asker.ask({}, { q: { type: "noul", instructions: "i" } });
      throw new Error("unreachable");
    } catch (e) {
      expect((e as AlgalError).code).toBe("EFFECT_FAILED");
      expect((e as AlgalError).message).not.toContain(KEY);
    }
  });

  test("malformed JSON and missing answers are unparseable", async () => {
    const bad1 = jevAsker({
      credential: KEY,
      fetch: (async () => new Response("not json", { status: 200 })) as unknown as typeof fetch,
    });
    await expect(
      bad1.ask({}, { q: { type: "noul", instructions: "i" } }),
    ).rejects.toThrow(AlgalError);
    const bad2 = jevAsker({
      credential: KEY,
      fetch: fakeFetch(() => ({ answers: {} })),
    });
    await expect(
      bad2.ask({}, { q: { type: "noul", instructions: "i" } }),
    ).rejects.toThrow(AlgalError);
  });

  test("redirects are refused", async () => {
    const asker = jevAsker({
      credential: KEY,
      fetch: (async () => new Response("", { status: 302 })) as unknown as typeof fetch,
    });
    await expect(
      asker.ask({}, { q: { type: "noul", instructions: "i" } }),
    ).rejects.toThrow(AlgalError);
  });
});

describe("jevExecutor", () => {
  const classifierReq: EffectRequest = {
    contract: "algal.effect.v1",
    cellId: "g",
    kind: "classifier",
    prompt: "allow this?",
    context: {},
    output: { kind: "choice", labels: ["allow", "deny"] },
    budget: { maxContextBytes: 4096, maxOutputBytes: 4096 },
  };

  test("serves a classifier via one choice question and stamps usage", async () => {
    let body: JsonObject | undefined;
    const ex = jevExecutor({
      credential: KEY,
      fetch: fakeFetch((_url, init) => {
        body = JSON.parse(String(init.body)) as JsonObject;
        return {
          model: "jev-latest",
          answers: {
            answer: { choice: "allow", confidence: 0.9, probabilities: { allow: 0.9, deny: 0.1 } },
          },
          usage: { input_tokens: 50, output_tokens: 2 },
        };
      }),
    });
    const result = await ex.executeEffect!(classifierReq);
    expect(result.output).toBe("allow");
    expect(result.metadata?.executor).toBe("jev");
    expect(result.metadata?.usage?.model).toBe("jev-latest");
    const questions = body!.questions as JsonObject;
    const q = questions.answer as JsonObject;
    expect(q.type).toBe("choice");
    expect((q.criteria as JsonObject).allow).toBeNull();
  });

  test("decide requests forward the declared question map", async () => {
    let body: JsonObject | undefined;
    const ex = jevExecutor({
      credential: KEY,
      fetch: fakeFetch((_url, init) => {
        body = JSON.parse(String(init.body)) as JsonObject;
        return {
          answers: {
            keep: { noul: 0.3 },
            rate: { score: 4, confidence: 0.8, probabilities: { "4": 0.8 } },
          },
        };
      }),
    });
    const decideReq: EffectRequest = {
      ...classifierReq,
      kind: "decide",
      output: { kind: "json", schema: {} },
      questions: {
        keep: { type: "noul", instructions: "keep?" },
        rate: { type: "score", instructions: "rate", criteria: ["1", "5"] },
      },
    };
    const result = await ex.executeEffect!(decideReq);
    const answers = (result.output as JsonObject).answers as JsonObject;
    expect((answers.keep as JsonObject).noul).toBe(0.3);
    expect((answers.rate as JsonObject).score).toBe(4);
    const sent = body!.questions as JsonObject;
    expect(Object.keys(sent).sort()).toEqual(["keep", "rate"]);
  });

  test("agent cells and approval gates are refused — jev decides, never generates or approves", async () => {
    const ex = jevExecutor({ credential: KEY, fetch: fakeFetch(() => ({})) });
    await expect(
      ex.execute({ ...classifierReq, kind: "agent", output: { kind: "text" } }),
    ).rejects.toThrow(AlgalError);
    await expect(
      ex.execute({ ...classifierReq, kind: "gate" }),
    ).rejects.toThrow(AlgalError);
  });

  test("cache identity covers provider+model, never the credential", () => {
    const a = jevExecutor({ credential: KEY });
    const b = jevExecutor({ credential: "different-key-entirely" });
    expect(a.cacheIdentity).toBe(b.cacheIdentity);
    const c = jevExecutor({ credential: KEY, model: "jev-pro-1" });
    expect(c.cacheIdentity).not.toBe(a.cacheIdentity);
    expect(c.id).toBe("jev:jev-pro-1");
    expect(a.id).toBe("jev");
    const wire = canonicalize({ id: a.cacheIdentity } as JsonValue);
    expect(wire).not.toContain(KEY);
  });
});


for (const failure of ["send", "body", "limit"] as const) {
  test(`Jev ${failure} failure marks completion uncertain without leaking transport details`, async () => {
    const asker = jevAsker({credential: KEY, maxResponseBytes: 32, fetch: async () => {
      if (failure === "send") throw new Error(`PRIVATE transport with ${KEY}`);
      if (failure === "limit") return new Response("x".repeat(33));
      return new Response(new ReadableStream({start(controller) {
        controller.enqueue(new TextEncoder().encode('{"answers":'));
        controller.error(new Error(`PRIVATE body with ${KEY}`));
      }}));
    }});
    let caught: unknown;
    try {await asker.ask({}, {q: {type: "noul", instructions: "relevant?"}});} catch (error) {caught = error;}
    expect(caught).toMatchObject({uncertain: true});
    expect(String(caught)).not.toContain("PRIVATE");
    expect(String(caught)).not.toContain(KEY);
  });
}

test("Jev credential cancellation stops dispatch after the resolver completes", async () => {
  let resolveKey!: (key: string) => void;
  let entered!: () => void;
  const resolving = new Promise<void>(done => {entered = done;});
  const key = new Promise<string>(done => {resolveKey = done;});
  let calls = 0;
  const asker = jevAsker({credential: async () => {entered(); return key;}, fetch: async () => {calls++; return Response.json({});}});
  const controller = new AbortController();
  const pending = asker.ask({}, {q: {type: "noul", instructions: "relevant?"}}, controller.signal);
  await resolving; controller.abort(); resolveKey(KEY);
  await expect(pending).rejects.toMatchObject({code: "BUDGET_EXHAUSTED", uncertain: false});
  expect(calls).toBe(0);
});

test("Jev preflight cancellation avoids credential resolution and malformed complete responses remain definite", async () => {
  let resolutions = 0;
  const controller = new AbortController(); controller.abort();
  const asker = jevAsker({credential: async () => {resolutions++; return KEY;}});
  await expect(asker.ask({}, {q: {type: "noul", instructions: "relevant?"}}, controller.signal))
    .rejects.toMatchObject({code: "BUDGET_EXHAUSTED", uncertain: false});
  expect(resolutions).toBe(0);
  const malformed = jevAsker({credential: KEY, fetch: async () => new Response("not JSON")});
  await expect(malformed.ask({}, {q: {type: "noul", instructions: "relevant?"}}))
    .rejects.toMatchObject({code: "EFFECT_UNPARSEABLE", uncertain: false});
  expect(() => jevAsker({credential: KEY, maxResponseBytes: 0})).toThrow("byte limit");
});

test("Jev cancellation while reading the response is uncertain", async () => {
  let bodyEntered!: () => void;
  const reading = new Promise<void>(done => {bodyEntered = done;});
  const asker = jevAsker({credential: KEY, fetch: async () => new Response(new ReadableStream({pull() {bodyEntered();}}))});
  const controller = new AbortController();
  const pending = asker.ask({}, {q: {type: "noul", instructions: "relevant?"}}, controller.signal);
  await reading; controller.abort();
  await expect(pending).rejects.toMatchObject({code: "BUDGET_EXHAUSTED", uncertain: true});
});
