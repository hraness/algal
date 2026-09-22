import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MemoryStore, builtinRegistry, verifyReceipt, type JsonValue, type ToolRegistry } from "../../index";
import { BASELINE_POLICY, type HarnessPolicy } from "./protocol";
import type { HarnessMemory, MemoryAction } from "./memory-contract";
import {
  harnessPrompt, parseHarnessAction, runHarness,
  type HarnessAction, type HarnessModelRequest, type HarnessOptions,
  type HarnessTerminal,
} from "./harness";

const finish: HarnessAction = { type: "finish", summary: "The task is finished." };
const terminal = (command: string): HarnessAction => ({ type: "terminal", command });
const goodOutput = { exitCode: 0, stdout: "ok", stderr: "" };
function scripted(actions: unknown[], requests: HarnessModelRequest[] = []): HarnessOptions["model"] {
  let index = 0;
  return async request => {
    requests.push(structuredClone(request));
    if (index >= actions.length) throw new Error("unexpected extra model invocation");
    return actions[index++];
  };
}
function options(mode: HarnessOptions["mode"], actions: unknown[], extra: Partial<HarnessOptions> = {}): HarnessOptions {
  return { mode, instruction: "Repair the supplied task.", policy: BASELINE_POLICY, model: scripted(actions), terminal: async () => goodOutput, ...extra };
}
function memoryAdapter(overrides: Partial<HarnessMemory> = {}): HarnessMemory {
  return {
    configurationDigest: `sha256:${"1".repeat(64)}`,
    description: "Logical fixture memory. Available procedure alias: tool.python.",
    execute: async () => ({ status: "unknown" }),
    invalidate() {},
    async settle() {},
    evidence: () => ({}),
    ...overrides,
  };
}

describe("coding harness", () => {
  test("baseline and ALGAL use identical prompts, observations, commands, and independently graded toy repairs", async () => {
    const roots: string[] = [];
    const requests: HarnessModelRequest[][] = [[], []];
    const commands: string[][] = [[], []];
    const outputs = [];
    try {
      for (const [index, mode] of (["baseline", "algal"] as const).entries()) {
        const root = await mkdtemp(join(tmpdir(), "algal-harness-"));
        roots.push(root);
        const path = join(root, "answer.txt");
        await writeFile(path, "3\n");
        const host: HarnessTerminal = async request => {
          commands[index]!.push(request.command);
          if (request.command === "read answer.txt") return { exitCode: 0, stdout: await readFile(path, "utf8"), stderr: "" };
          if (request.command === "write correct answer") {
            await writeFile(path, "4\n");
            return { exitCode: 0, stdout: "updated", stderr: "" };
          }
          if (request.command === "run visible tests") return (await readFile(path, "utf8")) === "4\n"
            ? { exitCode: 0, stdout: "visible test passed", stderr: "" }
            : { exitCode: 1, stdout: "", stderr: "expected 4" };
          throw new Error("unadmitted fixture command");
        };
        const actions = [terminal("read answer.txt"), terminal("run visible tests"), terminal("write correct answer"), terminal("run visible tests"), finish];
        const run = await runHarness(options(mode, actions, { model: scripted(actions, requests[index]!), terminal: host }));
        expect(run.termination).toBe("finished");
        expect(run.modelAttempts).toBe(5);
        expect(run.terminalCalls).toBe(4);
        // Independent grading reads the actual artifact after the agent stops.
        expect(await readFile(path, "utf8")).toBe("4\n");
        expect("success" in run).toBe(false);
        outputs.push(run);
      }
      expect(requests[0]).toEqual(requests[1]);
      expect(commands[0]).toEqual(commands[1]);
      expect(outputs[0]!.messages).toEqual(outputs[1]!.messages);
      expect(outputs[0]!.trace).toEqual(outputs[1]!.trace);
      expect(outputs[1]!.receipt?.work.agentCalls).toBe(5);
      expect(outputs[1]!.receipt?.effects.filter(effect => effect.executor.startsWith("tool:")).length).toBe(4);
      expect(outputs[1]!.verification?.ok).toBe(true);
    } finally { await Promise.all(roots.map(root => rm(root, { recursive: true, force: true }))); }
  });

  test("a dishonest finish is termination, never an independent passing grade", async () => {
    for (const mode of ["baseline", "algal"] as const) {
      let artifact = "still broken";
      const run = await runHarness(options(mode, [{ type: "finish", summary: "All tests pass" }], {
        terminal: async () => { artifact = "fixed"; return goodOutput; },
      }));
      expect(run.termination).toBe("finished");
      expect(run.terminalCalls).toBe(0);
      expect(artifact).toBe("still broken");
      expect("passed" in run).toBe(false);
    }
  });

  test("the attempt ceiling dispatches the same last tool in both engines and then stops", async () => {
    const requests: HarnessModelRequest[][] = [[], []];
    for (const [index, mode] of (["baseline", "algal"] as const).entries()) {
      const actions = [terminal("first"), terminal("second"), finish];
      const run = await runHarness(options(mode, actions, { maxModelAttempts: 2, model: scripted(actions, requests[index]!) }));
      expect(run.termination).toBe("budget-exhausted");
      expect(run.modelAttempts).toBe(2);
      expect(run.terminalCalls).toBe(2);
      if (mode === "algal") expect(run.verification?.ok).toBe(true);
    }
    expect(requests[0]).toEqual(requests[1]);
    expect(requests[0]).toHaveLength(2);
    expect(requests[0]![1]!.prompt).toContain('"remainingAttemptsIncludingCurrent":1,"remainingAttemptsAfterCurrent":0');
    expect(requests[0]![1]!.prompt).toContain("A terminal action on the last attempt still runs");
  });

  test("every model response sees the JSON action proxy and exact remaining attempt budget", async () => {
    const requests: HarnessModelRequest[][] = [[], []];
    for (const [index, mode] of (["baseline", "algal"] as const).entries()) {
      const actions = [terminal("inspect"), terminal("repair"), finish];
      const run = await runHarness(options(mode, actions, { maxModelAttempts: 3, model: scripted(actions, requests[index]!) }));
      expect(run.termination).toBe("finished");
      expect(run.modelAttempts).toBe(3);
      const budgets = requests[index]!.map(request => {
        expect(request.prompt).toStartWith("algal.coding-harness.prompt.v2\n");
        expect(request.prompt).toContain("Native provider tools are intentionally disabled");
        expect(request.prompt).toContain("return a terminal object and the host runs its command");
        expect(request.prompt).toContain("terminal JSON action remains available on every response");
        return JSON.parse(request.prompt.split("Attempt budget (JSON): ")[1]!);
      });
      expect(budgets).toEqual([
        { currentAttempt: 1, maxAttempts: 3, remainingAttemptsIncludingCurrent: 3, remainingAttemptsAfterCurrent: 2 },
        { currentAttempt: 2, maxAttempts: 3, remainingAttemptsIncludingCurrent: 2, remainingAttemptsAfterCurrent: 1 },
        { currentAttempt: 3, maxAttempts: 3, remainingAttemptsIncludingCurrent: 1, remainingAttemptsAfterCurrent: 0 },
      ]);
    }
    expect(requests[0]).toEqual(requests[1]);
  });

  test("unknown tool-shaped replies and extra fields fail closed before terminal dispatch", async () => {
    const invalid = [
      { tool: "unadmitted.v1", inputs: {} },
      { type: "terminal", command: "echo yes", cwd: "/" },
      { type: "finish", summary: "done", passed: true },
      "not JSON",
    ];
    for (const mode of ["baseline", "algal"] as const) for (const action of invalid) {
      const run = await runHarness(options(mode, [action]));
      expect(run.termination).toBe("failed");
      expect(run.modelAttempts).toBe(1);
      expect(run.terminalCalls).toBe(0);
      if (mode === "algal") expect(run.verification?.ok).toBe(true);
    }
    expect(parseHarnessAction(JSON.stringify(finish))).toEqual(finish);
  });

  test("context selection changes actual model observations equally while retaining full receipts", async () => {
    const policy: HarnessPolicy = { ...BASELINE_POLICY, context: { mode: "recent-with-first", maxMessages: 4 } };
    const requests: HarnessModelRequest[][] = [[], []];
    for (const [index, mode] of (["baseline", "algal"] as const).entries()) {
      const actions = [terminal("first"), terminal("second"), finish];
      const run = await runHarness(options(mode, actions, { policy, model: scripted(actions, requests[index]!) }));
      expect(run.termination).toBe("finished");
      expect(requests[index]![2]!.context.map(message => message.role)).toEqual(["user", "assistant", "tool"]);
      expect(JSON.parse(requests[index]![2]!.context[1]!.content)).toEqual(terminal("second"));
      expect(JSON.parse(requests[index]![2]!.context[2]!.content)).toEqual(goodOutput);
      expect(run.messages).toHaveLength(6);
    }
    expect(requests[0]).toEqual(requests[1]);
    expect(harnessPrompt({ ...policy, testPolicy: "test-after-edit" })).not.toBe(harnessPrompt({ ...policy, testPolicy: "focused-first" }));
    expect(harnessPrompt({ ...policy, recoveryPolicy: "diagnose-once" })).not.toBe(harnessPrompt({ ...policy, recoveryPolicy: "retry-with-context" }));
  });

  test("an impossible projected-context bound is rejected before any model or terminal dispatch", async () => {
    for (const mode of ["baseline", "algal"] as const) {
      let calls = 0;
      await expect(runHarness(options(mode, [finish], {
        policy: { ...BASELINE_POLICY, context: { mode: "recent-with-first", maxMessages: 2 } },
        model: async () => { calls++; return finish; },
        terminal: async () => { calls++; return goodOutput; },
      }))).rejects.toThrow("instruction plus a complete assistant/tool pair");
      expect(calls).toBe(0);
    }
  });

  test("a context-only policy change changes manifest and backend configuration identity", async () => {
    const full = await runHarness(options("algal", [finish], { policy: { ...BASELINE_POLICY, context: { mode: "full" } } }));
    const projected = await runHarness(options("algal", [finish], { policy: { ...BASELINE_POLICY, context: { mode: "recent-with-first", maxMessages: 3 } } }));
    expect(full.receipt?.manifestDigest).not.toBe(projected.receipt?.manifestDigest);
    expect(full.receipt?.effects[0]?.configurationDigest).not.toBe(projected.receipt?.effects[0]?.configurationDigest);
    expect(full.verification?.ok).toBe(true);
    expect(projected.verification?.ok).toBe(true);
  });

  test("full escaped context hits the same bound before model dispatch in both engines even with projection", async () => {
    const command = `x${"\n".repeat(8100)}`;
    const actions = [...Array.from({ length: 15 }, () => terminal(command)), finish];
    const policies: HarnessPolicy[] = [BASELINE_POLICY, {
      ...BASELINE_POLICY, context: { mode: "recent-with-first", maxMessages: 3 },
    }];
    for (const policy of policies) {
      const results = [];
      for (const mode of ["baseline", "algal"] as const) {
        results.push(await runHarness(options(mode, actions, {
          policy, maxModelAttempts: 16,
          terminal: async () => ({ exitCode: 0, stdout: "x".repeat(8192), stderr: "" }),
        })));
      }
      expect(results[0]!.termination).toBe("failed");
      expect(results[0]!.modelAttempts).toBe(11);
      expect(results[0]!.terminalCalls).toBe(11);
      expect(results[0]!.error).toContain("exceeds maxContextBytes 262144B");
      expect(results[1]!.termination).toBe(results[0]!.termination);
      expect(results[1]!.modelAttempts).toBe(results[0]!.modelAttempts);
      expect(results[1]!.terminalCalls).toBe(results[0]!.terminalCalls);
      expect(results[1]!.error).toBe(results[0]!.error);
      expect(results[1]!.trace).toEqual(results[0]!.trace);
      expect(results[1]!.verification?.ok).toBe(true);
    }
  });

  test("valid multiline terminal output remains admissible after JSON escaping", async () => {
    const stdout = `${"x".repeat(7900)}${"\n".repeat(200)}`;
    const runs = [];
    for (const mode of ["baseline", "algal"] as const) {
      const run = await runHarness(options(mode, [terminal("read log"), finish], {
        terminal: async () => ({ exitCode: 0, stdout, stderr: "" }),
      }));
      expect(run.termination).toBe("finished");
      expect(run.modelAttempts).toBe(2);
      runs.push(run);
    }
    expect(runs[0]!.trace).toEqual(runs[1]!.trace);
    expect(runs[1]!.verification?.ok).toBe(true);
  });

  test("tool overflow fails once without retrying or letting the model observe the oversized result", async () => {
    for (const mode of ["baseline", "algal"] as const) {
      let calls = 0;
      const run = await runHarness(options(mode, [terminal("read"), finish], {
        maxTerminalOutputBytes: 8,
        terminal: async () => { calls++; return { exitCode: 0, stdout: "0123456789", stderr: "" }; },
      }));
      expect(run.termination).toBe("failed");
      expect(run.modelAttempts).toBe(1);
      expect(calls).toBe(1);
      expect(run.error).toContain("byte bound");
    }
  });

  test("offline verification consumes recorded terminal outcomes, detects tampering, and never invokes callbacks", async () => {
    const store = new MemoryStore();
    let callbacks = 0;
    const run = await runHarness(options("algal", [terminal("read"), finish], {
      store, terminal: async () => { callbacks++; return goodOutput; },
    }));
    expect(callbacks).toBe(1);
    const tools: ToolRegistry = new Map([["harness-terminal.v1", {
      signature: {
        inputs: { command: { type: "text" } }, outputs: { result: { type: "json" } },
        effect: "write", cost: 100, maxOutputBytes: 65536,
      },
      tool: async () => { throw new Error("replay must never contact the terminal"); },
    }]]);
    expect((await verifyReceipt(run.receipt as unknown as JsonValue, run.manifest!, store, builtinRegistry(), undefined, tools)).ok).toBe(true);
    const tampered = structuredClone(run.receipt!);
    tampered.effects.find(effect => effect.executor.startsWith("tool:"))!.output = { result: { exitCode: 0, stdout: "forged", stderr: "" } };
    let rejected = false;
    try {
      const checked = await verifyReceipt(tampered as unknown as JsonValue, run.manifest!, store, builtinRegistry(), undefined, tools);
      rejected = !checked.ok;
    } catch { rejected = true; }
    expect(rejected).toBe(true);
    expect(callbacks).toBe(1);
  });

  test("pre-cancelled work never calls model or terminal in either mode", async () => {
    for (const mode of ["baseline", "algal"] as const) {
      const controller = new AbortController();
      controller.abort();
      let calls = 0;
      const run = await runHarness(options(mode, [finish], {
        signal: controller.signal,
        model: async () => { calls++; return finish; },
      }));
      expect(run.termination).toBe("failed");
      expect(calls).toBe(0);
    }
  });
});

describe("coding harness memory actions", () => {
  test("read/query/probe and ordinary commands have identical observations, budgets, and effects in both engines", async () => {
    const requests: HarnessModelRequest[][] = [[], []];
    const events: string[][] = [[], []];
    const runs = [];
    const actions: HarnessAction[] = [
      { type: "memory.read" }, { type: "memory.query", procedure: "tool.python" },
      { type: "memory.probe", procedure: "tool.python" }, terminal("ordinary edit"),
      { type: "memory.query", procedure: "tool.python" }, finish,
    ];
    for (const [index, mode] of (["baseline", "algal"] as const).entries()) {
      let invalidations = 0;
      const memory = memoryAdapter({
        execute: async (action, probe, signal) => {
          events[index]!.push(action.type);
          if (action.type === "memory.probe") {
            const output = await probe({ command: "probe python", maxOutputBytes: 128, timeoutMs: 1000 }, signal);
            return { action: action.type, output };
          }
          return { action: action.type, invalidations };
        },
        invalidate: () => { events[index]!.push("invalidate"); invalidations++; },
        settle: async () => { events[index]!.push("settle"); },
      });
      const run = await runHarness(options(mode, actions, {
        maxModelAttempts: 6, memory, model: scripted(actions, requests[index]!),
        terminal: async request => { events[index]!.push(`terminal:${request.command}`); return goodOutput; },
      }));
      expect(run.termination).toBe("finished");
      expect(run.modelAttempts).toBe(6);
      expect(run.terminalCalls).toBe(2);
      expect(run.messages).toHaveLength(12);
      expect(run.trace.filter(entry => entry.kind === "memory")).toHaveLength(4);
      expect(run.trace.filter(entry => entry.kind === "terminal" && entry.source === "memory.probe")).toHaveLength(1);
      expect(requests[index]![3]!.context.map(message => message.role)).toEqual(["user", "assistant", "tool", "assistant", "tool", "assistant", "tool"]);
      expect(JSON.parse(requests[index]![3]!.context[5]!.content)).toEqual(actions[2]);
      expect(requests[index]![0]!.prompt).toContain(memory.description);
      expect(requests[index]![5]!.prompt).toContain('"remainingAttemptsIncludingCurrent":1,"remainingAttemptsAfterCurrent":0');
      expect(events[index]).toEqual([
        "memory.read", "memory.query", "memory.probe", "terminal:probe python",
        "invalidate", "terminal:ordinary edit", "memory.query", "settle",
      ]);
      if (mode === "algal") {
        expect(run.verification?.ok).toBe(true);
        const toolEffects = run.receipt!.effects.filter(effect => effect.executor.startsWith("tool:"));
        expect(toolEffects).toHaveLength(5);
        expect(toolEffects.filter(effect => effect.executor === "tool:harness-memory.v1")).toHaveLength(4);
      }
      runs.push(run);
    }
    expect(requests[0]).toEqual(requests[1]);
    expect(runs[0]!.messages).toEqual(runs[1]!.messages);
    expect(runs[0]!.trace).toEqual(runs[1]!.trace);
  });

  test("memory actions require configuration and accept only closed alias-based shapes", async () => {
    const admitted: MemoryAction[] = [{ type: "memory.read" }, { type: "memory.query", procedure: "tool.python" }, { type: "memory.probe", procedure: "tool.python" }];
    for (const action of admitted) {
      expect(parseHarnessAction(JSON.stringify(action))).toEqual(action);
      for (const mode of ["baseline", "algal"] as const) {
        const run = await runHarness(options(mode, [action, finish]));
        expect(run.termination).toBe("failed");
        expect(run.error).toContain("configured memory adapter");
        expect(run.modelAttempts).toBe(1);
        expect(run.terminalCalls).toBe(0);
      }
    }
    for (const action of [
      { type: "memory.read", reference: "private" }, { type: "memory.query" },
      { type: "memory.query", procedure: "../private" }, { type: "memory.probe", procedure: "/host/path" },
      { type: "memory.query", procedure: "sha256:unadmitted" },
      { type: "memory.probe", procedure: "a".repeat(65) }, { type: "memory.write", procedure: "tool.python" },
      { type: "memory.probe", procedure: "tool.python", command: "arbitrary" },
    ]) expect(() => parseHarnessAction(action)).toThrow();
  });

  test("read and query callbacks cannot execute terminal probes", async () => {
    for (const mode of ["baseline", "algal"] as const) for (const action of [
      { type: "memory.read" }, { type: "memory.query", procedure: "tool.python" },
    ] as MemoryAction[]) {
      let settled = false;
      let terminalCalls = 0;
      const run = await runHarness(options(mode, [action, finish], {
        memory: memoryAdapter({
          execute: async (_action, probe) => probe({ command: "forbidden", maxOutputBytes: 100, timeoutMs: 1000 }),
          settle: async () => { settled = true; },
        }),
        terminal: async () => { terminalCalls++; return goodOutput; },
      }));
      expect(run.termination).toBe("failed");
      expect(run.error).toContain("read/query cannot execute terminal probes");
      expect(terminalCalls).toBe(0);
      expect(run.terminalCalls).toBe(0);
      expect(settled).toBe(true);
    }
  });

  test("memory actions consume the ordinary attempt ceiling without hidden model turns", async () => {
    for (const mode of ["baseline", "algal"] as const) {
      let executions = 0;
      const run = await runHarness(options(mode, [{ type: "memory.read" }, { type: "memory.query", procedure: "tool.python" }, finish], {
        maxModelAttempts: 2,
        memory: memoryAdapter({ execute: async () => { executions++; return { status: "unknown" }; } }),
      }));
      expect(run.termination).toBe("budget-exhausted");
      expect(run.modelAttempts).toBe(2);
      expect(executions).toBe(2);
      expect(run.terminalCalls).toBe(0);
      if (mode === "algal") expect(run.verification?.ok).toBe(true);
    }
  });

  test("bounded memory exhaustion stays explicit and oversized output never reaches the model", async () => {
    for (const mode of ["baseline", "algal"] as const) {
      const requests: HarnessModelRequest[] = [];
      const exhausted = { status: "exhausted", reason: "operation ceiling" };
      const actions: HarnessAction[] = [{ type: "memory.read" }, finish];
      const run = await runHarness(options(mode, actions, {
        model: scripted(actions, requests), memory: memoryAdapter({ execute: async () => exhausted }),
      }));
      expect(run.termination).toBe("finished");
      expect(JSON.parse(requests[1]!.context[2]!.content)).toEqual(exhausted);
      let executions = 0;
      const oversized = await runHarness(options(mode, actions, {
        memory: memoryAdapter({ execute: async () => { executions++; return { text: "x".repeat(8192) }; } }),
      }));
      expect(oversized.termination).toBe("failed");
      expect(oversized.error).toContain("memory result exceeds 8192-byte bound");
      expect(oversized.modelAttempts).toBe(1);
      expect(executions).toBe(1);
      expect(oversized.messages.filter(message => message.role === "tool")).toHaveLength(0);
    }
  });

  test("cancelled probes join the physical terminal and memory settlement before returning", async () => {
    for (const mode of ["baseline", "algal"] as const) {
      let began!: () => void;
      let release!: () => void;
      const started = new Promise<void>(resolve => { began = resolve; });
      const finished = new Promise<void>(resolve => { release = resolve; });
      const controller = new AbortController();
      const order: string[] = [];
      let returned = false;
      const pending = runHarness(options(mode, [{ type: "memory.probe", procedure: "tool.python" }, finish], {
        signal: controller.signal,
        memory: memoryAdapter({
          execute: async (_action, probe, signal) => probe({ command: "probe", maxOutputBytes: 100, timeoutMs: 1000 }, signal),
          settle: async () => { order.push("memory-settled"); },
        }),
        terminal: async () => { began(); await finished; order.push("terminal-settled"); return goodOutput; },
      })).then(value => { returned = true; return value; });
      await started;
      controller.abort();
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(returned).toBe(false);
      release();
      const run = await pending;
      expect(run.termination).toBe("failed");
      expect(run.terminalCalls).toBe(1);
      expect(order).toEqual(["terminal-settled", "memory-settled"]);
    }
  });

  test("memory receipt replay consumes recorded results without native queries or terminal probes", async () => {
    const store = new MemoryStore();
    let memoryCalls = 0;
    let terminalCalls = 0;
    const run = await runHarness(options("algal", [
      { type: "memory.read" }, { type: "memory.query", procedure: "tool.python" },
      { type: "memory.probe", procedure: "tool.python" }, finish,
    ], {
      store,
      memory: memoryAdapter({ execute: async (action, probe, signal) => {
        memoryCalls++;
        return action.type === "memory.probe"
          ? probe({ command: "probe", maxOutputBytes: 100, timeoutMs: 1000 }, signal)
          : { status: "unknown" };
      } }),
      terminal: async () => { terminalCalls++; return goodOutput; },
    }));
    expect(run.termination).toBe("finished");
    expect(memoryCalls).toBe(3);
    expect(terminalCalls).toBe(1);
    const tools: ToolRegistry = new Map([["harness-memory.v1", {
      signature: { inputs: { action: { type: "json" } }, outputs: { result: { type: "json" } }, effect: "write", cost: 100, maxOutputBytes: 65536 },
      tool: async () => { throw new Error("replay must not run a memory query or probe"); },
    }], ["harness-terminal.v1", {
      signature: { inputs: { command: { type: "text" } }, outputs: { result: { type: "json" } }, effect: "write", cost: 100, maxOutputBytes: 65536 },
      tool: async () => { throw new Error("replay must not run a terminal command"); },
    }]]);
    expect((await verifyReceipt(run.receipt as unknown as JsonValue, run.manifest!, store, builtinRegistry(), undefined, tools)).ok).toBe(true);
    expect(memoryCalls).toBe(3);
    expect(terminalCalls).toBe(1);
    const tampered = structuredClone(run.receipt!);
    tampered.effects.find(effect => effect.executor === "tool:harness-memory.v1")!.output = { result: { status: "forged" } };
    let rejected = false;
    try { rejected = !(await verifyReceipt(tampered as unknown as JsonValue, run.manifest!, store, builtinRegistry(), undefined, tools)).ok; }
    catch { rejected = true; }
    expect(rejected).toBe(true);
  });
});
