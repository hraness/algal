// Freeze code, protocol, task snapshots, and route before provider work.
// A started stage is never inferred to be safe to retry from missing output.
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { digestCanonical, type Digest } from "../../../../src/digest";
import { canonicalize, type JsonValue } from "../../../../src/values";

export const ROOT = resolve(import.meta.dir, "../../../..");
export const ROUTE = { baseUrl: "https://api.x.ai/v1", model: "grok-4.5", credentialEnv: "XAI_API_KEY" } as const;
const json = (value: unknown): JsonValue => value as JsonValue;
export const hash = (value: unknown): Digest => digestCanonical(json(value));
export function requireMatch(ok: boolean, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
export function readJson(path: string): unknown {
  const info = lstatSync(path);
  requireMatch(info.isFile() && !info.isSymbolicLink() && info.size <= 64 * 1024 * 1024, `invalid or oversized artifact ${path}`);
  return JSON.parse(readFileSync(path, "utf8"));
}
export function writeNew(path: string, value: unknown): void {
  writeFileSync(path, canonicalize(json(value)) + "\n", { flag: "wx" });
}

export type FrozenIdentity = {
  contract: "algal.study-freeze.v1";
  protocol: Digest;
  datasets: Digest;
  route: typeof ROUTE;
  bunVersion: string;
  sources: Record<string, string>;
  sourceCommit: string;
  digest: Digest;
};

/** Include the full reference runtime and every imported study helper. */
export function sourceBindings(root = ROOT): Record<string, string> {
  const paths = ["cli.ts", "package.json", "bun.lock"];
  for (const dir of ["src", "experiments/cumulative-skill/arms/v5", "experiments/cumulative-skill/arms/v6", "experiments/cumulative-skill/pipeline"]) {
    const visit = (path: string): void => {
      for (const name of readdirSync(path).sort()) {
        const full = join(path, name);
        const info = lstatSync(full);
        requireMatch(!info.isSymbolicLink(), `source symlink is not allowed: ${full}`);
        if (info.isDirectory()) visit(full);
        else if (/\.(?:ts|wasm|json|py|sh)$/.test(name) && !name.endsWith(".test.ts")) paths.push(relative(root, full));
      }
    };
    visit(join(root, dir));
  }
  return Object.fromEntries(paths.sort().map(path => [path, createHash("sha256").update(readFileSync(join(root, path))).digest("hex")]));
}

export function freezeStudy(studyDir: string, protocol: unknown, datasets: unknown, sourceCommit: string): FrozenIdentity {
  requireMatch(/^[0-9a-f]{40}$/.test(sourceCommit), "freeze requires the committed source SHA");
  requireMatch(!existsSync(studyDir), "study already exists; preserve its attempts and use its frozen identity");
  const base = {
    contract: "algal.study-freeze.v1" as const, protocol: hash(protocol), datasets: hash(datasets),
    route: ROUTE, bunVersion: Bun.version, sources: sourceBindings(), sourceCommit,
  };
  const identity = { ...base, digest: hash(base) };
  mkdirSync(studyDir, { recursive: true });
  writeNew(join(studyDir, "protocol.json"), protocol);
  writeNew(join(studyDir, "datasets.json"), datasets);
  writeNew(join(studyDir, "freeze.json"), identity);
  return identity;
}

export function checkFreeze(studyDir: string, protocol: unknown, datasets: unknown): FrozenIdentity {
  const identity = readJson(join(studyDir, "freeze.json")) as FrozenIdentity;
  const { digest, ...body } = identity;
  requireMatch(digest === hash(body) && identity.contract === "algal.study-freeze.v1", "invalid freeze identity");
  requireMatch(identity.protocol === hash(protocol) && identity.protocol === hash(readJson(join(studyDir, "protocol.json"))), "protocol differs from freeze");
  requireMatch(identity.datasets === hash(datasets) && identity.datasets === hash(readJson(join(studyDir, "datasets.json"))), "datasets differ from freeze");
  requireMatch(hash(identity.route) === hash(ROUTE) && identity.bunVersion === Bun.version, "executor route or Bun version differs from freeze");
  requireMatch(hash(identity.sources) === hash(sourceBindings()), "implementation or runtime changed after freeze");
  return identity;
}

export type StageAttempt = { contract: "algal.study-stage.v1"; freeze: Digest; block: string; stage: string; input: Digest };

/** mkdir is the exclusive claim; leave it in place after every outcome. */
export function startStage(studyDir: string, freeze: FrozenIdentity, block: string, stage: string, input: unknown): string {
  requireMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(block) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(stage), "invalid stage path");
  const parent = join(studyDir, block, "attempts");
  mkdirSync(parent, { recursive: true });
  const attemptDir = join(parent, stage);
  requireMatch(!existsSync(attemptDir), `${block}/${stage} already started; reconcile its saved attempt before any new provider call`);
  mkdirSync(attemptDir);
  const binding: StageAttempt = { contract: "algal.study-stage.v1", freeze: freeze.digest, block, stage, input: hash(input) };
  writeNew(join(attemptDir, "input.json"), input);
  writeNew(join(attemptDir, "binding.json"), binding);
  return attemptDir;
}

export function verifyStage(studyDir: string, freeze: FrozenIdentity, block: string, stage: string, input: unknown): unknown {
  const dir = join(studyDir, block, "attempts", stage);
  const binding = readJson(join(dir, "binding.json"));
  requireMatch(hash(binding) === hash({ contract: "algal.study-stage.v1", freeze: freeze.digest, block, stage, input: hash(input) }), `${block}/${stage}: attempt binding mismatch`);
  requireMatch(hash(readJson(join(dir, "input.json"))) === hash(input), `${block}/${stage}: input snapshot mismatch`);
  return readJson(join(dir, "result.json"));
}
