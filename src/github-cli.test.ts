import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { githubCliTransport } from "./github-cli";
import type { GitHubRequest } from "./github";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});
function fakeGh(source: string): string {
  const dir = mkdtempSync(join(tmpdir(), "algal-gh-cli-"));
  dirs.push(dir);
  const executable = join(dir, "gh");
  writeFileSync(executable, `#!${process.execPath}\n${source}`, {
    mode: 0o700,
  });
  return executable;
}
const request = (extras: Partial<GitHubRequest> = {}): GitHubRequest => ({
  method: "GET",
  path: "/repos/acme/demo/pulls/7",
  signal: new AbortController().signal,
  maxBytes: 8192,
  ...extras,
});
const emit = (code: number, json: string, headers = ""): string => {
  const prefix = `HTTP/2.0 ${code} Response\r\n${headers.replaceAll("\\r\\n", "\r\n")}\r\n`;
  return `console.log(${JSON.stringify(prefix)} + JSON.stringify(${json}));`;
};

describe("GitHub CLI transport custody", () => {
  test("uses fixed host and argv without a shell, preserving HTTP errors", async () => {
    const executable = fakeGh(
      `const input = await Bun.stdin.text(); ${emit(404, "{args:process.argv.slice(2),input}", 'link: <https://api.github.com/repos/acme/demo/pulls?page=2>; rel="next"\\r\\n')} process.exit(1);`,
    );
    const result = await githubCliTransport({ executable })(request());
    expect(result.status).toBe(404);
    expect(result.headers?.link).toContain('rel="next"');
    expect((result.body as { args: string[] }).args).toEqual([
      "api",
      "--hostname",
      "github.com",
      "--include",
      "--method",
      "GET",
      "--header",
      "Accept: application/vnd.github+json",
      "--header",
      "X-GitHub-Api-Version: 2022-11-28",
      "/repos/acme/demo/pulls/7",
    ]);
    expect((result.body as { input: string }).input).toBe("");
  });
  test("POST and PUT send structured JSON through stdin", async () => {
    const executable = fakeGh(
      `const input = JSON.parse(await Bun.stdin.text()); ${emit(200, "{args:process.argv.slice(2),input}")}`,
    );
    for (const method of ["POST", "PUT"] as const) {
      const body = {
        query: "literal `command` $(not-a-shell)",
        nested: { value: "new\nline" },
      };
      const result = await githubCliTransport({ executable })(
        request({
          method,
          path:
            method === "POST" ? "/graphql" : "/repos/acme/demo/pulls/7/merge",
          body,
        }),
      );
      expect((result.body as { input: unknown }).input).toEqual(body);
      expect((result.body as { args: string[] }).args).toContain("--input");
    }
  });
  test("awaits large backpressured input delivery", async () => {
    const body = { query: "x".repeat(250_000) };
    const reader = fakeGh(
      `await Bun.sleep(10); const input = JSON.parse(await Bun.stdin.text()); ${emit(200, "{length:input.query.length}")}`,
    );
    const result = await githubCliTransport({ executable: reader })(
      request({ method: "POST", path: "/graphql", body }),
    );
    expect(result.body).toEqual({ length: 250_000 });
  });
  test("observes asynchronous closed-pipe failures from both write and end", async () => {
    // Isolate the deterministic FileSink fault in another process. A real
    // short-lived child may let the kernel accept the entire bounded body
    // before closing, which does not demonstrate an incomplete pipe write.
    const source = `
      import {githubCliTransport} from ${JSON.stringify(new URL("./github-cli.ts", import.meta.url).href)};
      const results = [];
      for (const fail of ["write", "end"]) for (const status of [200, 403]) {
        const output = new TextEncoder().encode("HTTP/2.0 " + status + " Response\\r\\n\\r\\n" + JSON.stringify({message: "response"}));
        const pipeFailure = async () => { await Promise.resolve(); throw Object.assign(new Error("PRIVATE_PIPE_DIAGNOSTIC"), {code: "EPIPE"}); };
        Bun.spawn = () => ({
          stdin: {
            write: fail === "write" ? pipeFailure : async value => value.length,
            end: fail === "end" ? pipeFailure : async () => 0,
          },
          stdout: new ReadableStream({start(controller) {controller.enqueue(output); controller.close();}}),
          stderr: new ReadableStream({start(controller) {controller.close();}}),
          exited: Promise.resolve(status === 403 ? 1 : 0),
          kill() {},
        });
        try {
          const result = await githubCliTransport()({method: "POST", path: "/graphql", body: {query: "x".repeat(250000)}, signal: new AbortController().signal, maxBytes: 8192});
          results.push({fail, status: result.status});
        } catch (error) { results.push({fail, code: error.code, message: error.message}); }
      }
      console.log(JSON.stringify(results));
    `;
    const child = Bun.spawn([process.execPath, "-e", source], {
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
    });
    const [output, diagnostic, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    expect(code).toBe(0);
    expect(diagnostic).toBe("");
    expect(JSON.parse(output)).toEqual([
      {
        fail: "write",
        code: "EFFECT_FAILED",
        message: "GitHub CLI closed stdin before request delivery",
      },
      { fail: "write", status: 403 },
      {
        fail: "end",
        code: "EFFECT_FAILED",
        message: "GitHub CLI closed stdin before request delivery",
      },
      { fail: "end", status: 403 },
    ]);
    expect(output).not.toContain("PRIVATE_PIPE_DIAGNOSTIC");
  });
  test("retains HTTP refusal after early input closure and rejects nonzero success", async () => {
    const refused = fakeGh(
      `import {closeSync} from "node:fs"; closeSync(0); ${emit(403, '{message:"Forbidden"}')} process.exit(1);`,
    );
    const result = await githubCliTransport({ executable: refused })(
      request({
        method: "POST",
        path: "/graphql",
        body: { query: "x".repeat(250_000) },
      }),
    );
    expect(result.status).toBe(403);
    expect(result.body).toEqual({ message: "Forbidden" });
    const failed = fakeGh(
      `await Bun.stdin.text(); ${emit(200, "{accepted:true}")} process.exit(2);`,
    );
    await expect(
      githubCliTransport({ executable: failed })(request()),
    ).rejects.toThrow("exited 2");
  });
  test("withholds private diagnostics and nonpagination headers", async () => {
    const executable = fakeGh(
      `console.error("PRIVATE_AUTH_DIAGNOSTIC"); ${emit(401, '{message:"Unauthorized"}', "set-cookie: PRIVATE_COOKIE\\r\\n")}`,
    );
    const result = await githubCliTransport({ executable })(request());
    expect(result.headers).toEqual({});
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
    const noResponse = fakeGh(
      'console.error("PRIVATE_AUTH_DIAGNOSTIC"); process.exit(1);',
    );
    await expect(
      githubCliTransport({ executable: noResponse })(request()),
    ).rejects.toThrow("diagnostics withheld");
  });
  test("rejects oversized stdout and diagnostics", async () => {
    const largeBody = fakeGh(emit(200, '"x".repeat(1000)'));
    await expect(
      githubCliTransport({ executable: largeBody })(request({ maxBytes: 64 })),
    ).rejects.toThrow("byte limit");
    const largeError = fakeGh(
      'await Bun.write(Bun.stderr, "x".repeat(70000)); await Bun.sleep(10000);',
    );
    await expect(
      githubCliTransport({ executable: largeError })(request()),
    ).rejects.toThrow("diagnostics exceeds");
  });
  test("kills and joins the subprocess on timeout or cancellation", async () => {
    const executable = fakeGh(
      "await Bun.stdin.text(); await Bun.sleep(10000);",
    );
    await expect(
      githubCliTransport({ executable, timeoutMs: 20 })(request()),
    ).rejects.toThrow("cancelled");
    const neverReads = fakeGh("await Bun.sleep(10000);");
    await expect(
      githubCliTransport({ executable: neverReads, timeoutMs: 20 })(
        request({
          method: "POST",
          path: "/graphql",
          body: { query: "x".repeat(250_000) },
        }),
      ),
    ).rejects.toThrow("cancelled");
    const controller = new AbortController();
    controller.abort();
    await expect(
      githubCliTransport({ executable })(
        request({ signal: controller.signal }),
      ),
    ).rejects.toThrow("before launch");
  });
  test("rejects bad HTTP framing, JSON, paths and methods", async () => {
    const bad = fakeGh('console.log("HTTP/2.0 200 OK\\r\\n\\r\\nnot-json");');
    await expect(
      githubCliTransport({ executable: bad })(request()),
    ).rejects.toThrow("not JSON");
    await expect(
      githubCliTransport({ executable: bad })(
        request({ path: "https://other.example/private" }),
      ),
    ).rejects.toThrow("path rejected");
    await expect(
      githubCliTransport({ executable: bad })(
        request({ path: "/repos/acme/demo/../other" }),
      ),
    ).rejects.toThrow("path rejected");
    await expect(
      githubCliTransport({ executable: bad })(request({ body: {} })),
    ).rejects.toThrow("method/body");
  });
});
