import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { codingCommand, parseXcbEnvelope, xcbTransport } from "./xcb";
import type { CodingJobIntent } from "./coding-jobs";
const dirs: string[] = [];
afterEach(async () => {
  for (const dir of dirs.splice(0))
    await rm(dir, { recursive: true, force: true });
});
async function fake(source: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "algal-xcb-fixture-"));
  dirs.push(dir);
  const path = join(dir, "xcb");
  await writeFile(path, `#!${process.execPath}\n${source}`, { mode: 0o700 });
  return path;
}
const envelope = () => ({
  version: 1,
  session: "s_fixture",
  state: "idle",
  outcome: {
    terminal: "completed",
    joined: true,
    effects: "none",
    pending_attention: false,
    failure: null,
  },
  text: "completed",
});
function intent(executable: string): CodingJobIntent {
  return {
    contract: "algal.coding-job.v1",
    workspace: tmpdir(),
    workspaceIdentity: { device: "1", inode: "1" },
    expectedHead: "a".repeat(40),
    sourceTree: "b".repeat(40),
    sourceRawDigest: `sha256:${"c".repeat(64)}`,
    gitDirectory: join(tmpdir(), "fixture-git"),
    prompt: "literal `command` $(not-a-shell)\nnew line",
    adapter: { executable, account: "literal-account", model: "literal-model" },
    limits: {
      maxRuntimeMs: 1000,
      maxOutputBytes: 8192,
      maxPatchBytes: 8192,
      maxChangedFiles: 4,
    },
  };
}
describe("bounded xcb transport", () => {
  test("uses supported fixed argv and exact prompt stdin, retaining the session", async () => {
    const executable = await fake(
        `const input = await Bun.stdin.text(); console.log(JSON.stringify({...${JSON.stringify(envelope())}, text: JSON.stringify({input,args:process.argv.slice(2)})}));`,
      ),
      admitted = intent(executable);
    const response = await xcbTransport({
      intent: admitted,
      signal: new AbortController().signal,
    });
    const output = parseXcbEnvelope(response.envelope);
    expect(output.session).toBe("s_fixture");
    expect(response.exitCode).toBe(0);
    expect(JSON.parse(output.text)).toEqual({
      input: admitted.prompt,
      args: [
        "--json",
        "--cwd",
        admitted.workspace,
        "run",
        "--account",
        "literal-account",
        "--model",
        "literal-model",
      ],
    });
  });
  test("retains authoritative nonzero exit without manufacturing completion", async () => {
    const executable = await fake(
      `await Bun.stdin.text(); console.log(${JSON.stringify(JSON.stringify(envelope()))}); process.exit(2);`,
    );
    expect(
      (
        await xcbTransport({
          intent: intent(executable),
          signal: new AbortController().signal,
        })
      ).exitCode,
    ).toBe(2);
  });
  test("bounds both streams and validates closed response fields", async () => {
    const executable = await fake(
      `await Bun.stdin.text(); console.log("x".repeat(9000));`,
    );
    await expect(
      xcbTransport({
        intent: intent(executable),
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow("exceeds");
    const diagnostic = await fake(
      `console.error("x".repeat(70000)); await Bun.sleep(10000);`,
    );
    await expect(
      xcbTransport({
        intent: intent(diagnostic),
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow("diagnostics exceeds");
    expect(() => parseXcbEnvelope({ ...envelope(), unexpected: true })).toThrow(
      "unknown key",
    );
    expect(() => parseXcbEnvelope({ ...envelope(), session: "" })).toThrow(
      "session",
    );
    expect(() =>
      parseXcbEnvelope({
        ...envelope(),
        outcome: { ...envelope().outcome, joined: "true" },
      }),
    ).toThrow("settlement flags");
  });
  test("a completion envelope followed by process signal cannot prove settlement", async () => {
    const executable = await fake(
      `await Bun.stdin.text(); await Bun.write(Bun.stdout, ${JSON.stringify(JSON.stringify(envelope()))}); process.kill(process.pid, "SIGKILL");`,
    );
    await expect(
      xcbTransport({
        intent: intent(executable),
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({ uncertain: true });
  });
  test("preserves empty non-executable arguments admitted by validation configs", async () => {
    const executable = await fake(
      "console.log(JSON.stringify(process.argv.slice(2)));",
    );
    const result = await codingCommand([executable, "", "after"], {
      cwd: tmpdir(),
      signal: new AbortController().signal,
      maxOutputBytes: 1024,
    });
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(new TextDecoder().decode(result.stdout))).toEqual([
      "",
      "after",
    ]);
    await expect(
      codingCommand(["", "after"], {
        cwd: tmpdir(),
        signal: new AbortController().signal,
        maxOutputBytes: 1024,
      }),
    ).rejects.toThrow("invalid coding command argv");
  });
  test("timeout joins its owned process and pre-abort prevents launch", async () => {
    const executable = await fake(
      "await Bun.stdin.text(); await Bun.sleep(10000);",
    );
    await expect(
      codingCommand([executable], {
        cwd: tmpdir(),
        input: "fixture",
        signal: new AbortController().signal,
        timeoutMs: 20,
        maxOutputBytes: 1024,
      }),
    ).rejects.toThrow("cancelled");
    const controller = new AbortController();
    controller.abort();
    await expect(
      codingCommand(["/definitely/absent"], {
        cwd: tmpdir(),
        signal: controller.signal,
        maxOutputBytes: 1024,
      }),
    ).rejects.toThrow("before launch");
  });
});
