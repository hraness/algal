import { afterEach, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

function fixture(mode = "complete") {
  const root = mkdtempSync(join(tmpdir(), "algal-v5-driver-"));
  roots.push(root);
  const study = join(root, "study");
  const corpus = join(study, "v4");
  mkdirSync(corpus, { recursive: true });
  mkdirSync(join(study, 'stores/v4/seed'), { recursive: true });
  writeFileSync(join(corpus, "fixed.config.json"), '{"frozen":"original"}\n');
  const mock = join(root, "mock-bun");
  writeFileSync(mock, `#!/usr/bin/env bun
import { appendFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
if (process.argv.includes('--version')) { console.log('test-bun'); process.exit(0); }
appendFileSync(process.env.CALLS, 'call\\n');
if (process.env.MODE === 'interrupt') process.exit(2);
const outcome = process.env.MODE;
const body = JSON.stringify({contract:'algal.experiment-session.v1',outcome});
writeFileSync(process.argv[process.argv.indexOf('--out') + 1], body);
console.log(JSON.stringify({session:'sha256:'+createHash('sha256').update(body).digest('hex'),outcome}));
process.exit(outcome === 'complete' ? 0 : 1);
`, { mode: 0o755 });
  const invokeWithFlags = (flags: string, ...args: string[]) => spawnSync("bash", [resolve(import.meta.dir, "run.sh"), ...args], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${dirname(process.execPath)}:${process.env.PATH}`, STUDY_DIR: study,
      BUN_BIN: mock, EXECUTOR_FLAGS: flags, CALLS: join(root, "calls"), MODE: mode },
  });
  const invoke = (...args: string[]) => invokeWithFlags("", ...args);
  return { root, study, corpus, invoke, invokeWithFlags, calls: () => readFileSync(join(root, "calls"), "utf8").trim().split("\n").length };
}

test("driver preserves the executed config and refuses repeated paid execution", () => {
  const f = fixture();
  const run = f.invoke("run", "v4", "fixed");
  expect(run.stderr).toBe("");
  expect(run.status).toBe(0);
  expect(readFileSync(join(f.corpus, "attempts/fixed/config.json"), "utf8")).toBe('{"frozen":"original"}\n');
  expect(f.invoke("run", "v4", "fixed").status).not.toBe(0);
  expect(f.calls()).toBe(1);
});

test("driver retains an exhausted session despite the CLI's nonzero exit", () => {
  const f = fixture("exhausted");
  expect(f.invoke("run", "v4", "fixed").status).toBe(0);
  expect(readFileSync(join(f.corpus, "sessions.d/fixed.outcome"), "utf8")).toBe("exhausted");
  expect(f.calls()).toBe(1);
});

test("driver preserves an interrupted attempt and never automatically retries it", () => {
  const f = fixture("interrupt");
  expect(f.invoke("run", "v4", "fixed").status).not.toBe(0);
  expect(existsSync(join(f.corpus, "sessions.d/fixed"))).toBe(false);
  expect(readFileSync(join(f.corpus, "attempts/fixed/exit-code"), "utf8")).toBe("2\n");
  expect(f.invoke("run", "v4", "fixed").status).not.toBe(0);
  expect(f.calls()).toBe(1);
});

test("driver refuses changed grading configs and incomplete reports", () => {
  const f = fixture();
  expect(f.invoke("run", "v4", "fixed").status).toBe(0);
  writeFileSync(join(f.corpus, "fixed.config.json"), '{"frozen":"changed"}\n');
  expect(f.invoke("grade", "v4").status).not.toBe(0);
  expect(f.invoke("report", "v4").status).not.toBe(0);
  expect(f.invoke("build", "v4").status).not.toBe(0);
  expect(f.calls()).toBe(1);
});

test("driver refuses a different executor before another arm makes a call", () => {
  const f = fixture();
  expect(f.invokeWithFlags('--base-url https://example.test/v1 --model first', 'run', 'v4', 'fixed').status).toBe(0);
  writeFileSync(join(f.corpus, 'retained.config.json'), '{}');
  expect(f.invokeWithFlags('--base-url https://example.test/v1 --model second', 'run', 'v4', 'retained').status).not.toBe(0);
  expect(f.calls()).toBe(1);
});

test("driver preserves quoted executor values in the execution identity", () => {
  const f = fixture();
  expect(f.invokeWithFlags('--model "a módèl with spaces"', 'run', 'v4', 'fixed').status).toBe(0);
  const identity = JSON.parse(readFileSync(join(f.study, 'execution.json'), 'utf8'));
  expect(identity.executor.model).toBe('a módèl with spaces');
  expect(identity.executorArgumentsDigest).toBe('sha256:' + createHash('sha256').update(JSON.stringify(['--model', 'a módèl with spaces'])).digest('hex'));
});

test("seed and frozen evaluation guards retain failed attempts without retrying", () => {
  const f = fixture('interrupt');
  expect(f.invoke('seed', 'v4').status).not.toBe(0);
  expect(f.invoke('seed', 'v4').status).not.toBe(0);
  expect(f.calls()).toBe(1);
  expect(f.invoke('evidence', '--eval-heads').status).not.toBe(0);
  expect(f.invoke('evidence', '--eval-heads').status).not.toBe(0);
  expect(f.calls()).toBe(2);
});
