import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MemoryStore, builtinRegistry, verifyReceipt, type JsonValue, type ToolRegistry } from "../../index";
import { BASELINE_POLICY, type HarnessPolicy } from "./protocol";
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
    for (const mode of ["baseline", "algal"] as const) {
      const run = await runHarness(options(mode, [terminal("first"), terminal("second"), finish], { maxModelAttempts: 2 }));
      expect(run.termination).toBe("budget-exhausted");
      expect(run.modelAttempts).toBe(2);
      expect(run.terminalCalls).toBe(2);
      if (mode === "algal") expect(run.verification?.ok).toBe(true);
    }
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
    const policy: HarnessPolicy = { ...BASELINE_POLICY, context: { mode: "recent-with-first", maxMessages: 2 } };
    const requests: HarnessModelRequest[][] = [[], []];
    for (const [index, mode] of (["baseline", "algal"] as const).entries()) {
      const actions = [terminal("first"), terminal("second"), finish];
      const run = await runHarness(options(mode, actions, { policy, model: scripted(actions, requests[index]!) }));
      expect(run.termination).toBe("finished");
      expect(requests[index]![2]!.context.map(message => message.role)).toEqual(["user", "tool"]);
      expect(run.messages).toHaveLength(6);
    }
    expect(requests[0]).toEqual(requests[1]);
    expect(harnessPrompt({ ...policy, testPolicy: "test-after-edit" })).not.toBe(harnessPrompt({ ...policy, testPolicy: "focused-first" }));
    expect(harnessPrompt({ ...policy, recoveryPolicy: "diagnose-once" })).not.toBe(harnessPrompt({ ...policy, recoveryPolicy: "retry-with-context" }));
  });

  test("a context-only policy change changes manifest and backend configuration identity", async () => {
    const full = await runHarness(options("algal", [finish], { policy: { ...BASELINE_POLICY, context: { mode: "full" } } }));
    const projected = await runHarness(options("algal", [finish], { policy: { ...BASELINE_POLICY, context: { mode: "recent-with-first", maxMessages: 2 } } }));
    expect(full.receipt?.manifestDigest).not.toBe(projected.receipt?.manifestDigest);
    expect(full.receipt?.effects[0]?.configurationDigest).not.toBe(projected.receipt?.effects[0]?.configurationDigest);
    expect(full.verification?.ok).toBe(true);
    expect(projected.verification?.ok).toBe(true);
  });

  test("full escaped context hits the same bound before model dispatch in both engines even with projection", async () => {
    const command = `x${"\n".repeat(8100)}`;
    const actions = [...Array.from({ length: 15 }, () => terminal(command)), finish];
    const policies: HarnessPolicy[] = [BASELINE_POLICY, {
      ...BASELINE_POLICY, context: { mode: "recent-with-first", maxMessages: 2 },
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
