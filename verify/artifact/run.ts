import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { copyFile, mkdir, mkdtemp, open, readdir, realpath, rename, rm, symlink } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { hashBytes, hashFile, hashJson, readFileBounded, readJson, type FileBinding } from "../lib/files";
import { CommandFailure, requireSuccess, runCommand } from "../lib/runner";
import { childEnv } from "../lib/command-supervisor";
import { admitBoundarySummary, runBoundary } from "../boundary/run";
import { array, digest, natural, record, requireThat } from "../lib/schema";

export const TOOLCHAIN = "1.97.1";
const TARGET = "wasm32-unknown-unknown";
const RUST_COMMIT = "8bab26f4f68e0e26f0bb7960be334d5b520ea452";
const LLVM = "22.1.6";
const ARTIFACT = "src/algal_expr.wasm";
const MANIFEST = "src/algal_expr.wasm.json";
const BUILD = ["build", "--offline", "--locked", "-p", "algal-expr", "--lib", "--target", TARGET, "--release", "--message-format=json-render-diagnostics"];
const NATIVE_BUILD = ["build", "--offline", "--locked", "-p", "algal-expr", "--example", "verification_boundary", "--message-format=json-render-diagnostics"];
const PACKAGES = [
  ["itoa", "1.0.18", "8f42a60cbdf9a97f5d2305f08a87dc4e09308d1276d28c869c684d7777685682"],
  ["memchr", "2.8.3", "cf8baf1c55e62ffcace7a9f06f4bd9cd3f0c4beb022d3b367256b91b87513d98"],
  ["ryu-js", "1.0.2", "dd29631678d6fb0903b69223673e122c32e9ae559d0960a38d574695ebc0ea15"],
  ["serde_core", "1.0.229", "67dca2c9c51e58a4791a4b1ed58308b39c64224d349a935ab5039aa360942a48"],
  ["serde_json", "1.0.151", "c841b55ecdae098c80dcae9cf767f6f8a0c2cdb3416bbef72181df4d0fe73f14"],
  ["zmij", "1.0.23", "29666d0abbfad1e3dc4dcf6144730dd3a3ab225bbbdac83319345b1b44ccfc1b"],
] as const;
const RECIPE = { toolchain: TOOLCHAIN, target: TARGET, rustCommit: RUST_COMMIT, llvm: LLVM, command: BUILD, nativeCommand: NATIVE_BUILD,
  packages: PACKAGES.map(([name, version, sha256]) => ({ name, version, sha256: `sha256:${sha256}` })),
  environment: { LANG: "C", LC_ALL: "C", TZ: "UTC", CARGO_INCREMENTAL: "0", SOURCE_DATE_EPOCH: "0" },
  remap: { build: "/algal/build", toolchain: "/algal/toolchain" },
  workspaceProjection: "Original workspace/manifests/lockfile and complete expression crate; empty unbuilt native lib.rs preserves workspace resolution." };
const ABI = [{ name: "algal_alloc", kind: "function" }, { name: "algal_check", kind: "function" }, { name: "algal_dealloc", kind: "function" }, { name: "algal_eval", kind: "function" }, { name: "memory", kind: "memory" }];

async function inventory(root: string, path: string): Promise<string[]> {
  const found: string[] = [];
  let visited = 0;
  async function walk(relative: string): Promise<void> {
    for (const entry of await readdir(join(root, relative), { withFileTypes: true })) {
      requireThat(++visited <= 20_000, "artifact inventory exceeds 20000 entries");
      const child = `${relative}/${entry.name}`;
      requireThat(!entry.isSymbolicLink(), `${child}: symlink is not an artifact input`);
      if (entry.isDirectory()) await walk(child);
      else { requireThat(entry.isFile(), `${child}: nonregular artifact input`); found.push(child); }
    }
  }
  await walk(path);
  return found.sort();
}

export async function artifactInputs(root: string): Promise<FileBinding[]> {
  const paths = ["Cargo.toml", "Cargo.lock", "crates/algal/Cargo.toml", "scripts/build-expr-wasm.sh", "verify/artifact/run.ts", "verify/boundary/run.ts", ...["runner", "command-supervisor", "files", "schema", "claims", "suites"].map(name => `verify/lib/${name}.ts`), ...await inventory(root, "crates/algal-expr")].sort();
  return Promise.all(paths.map(async path => ({ path, sha256: await hashFile(root, path) })));
}

function wasmBinding(bytes: Uint8Array): { sha256: string; size: number; exports: typeof ABI } {
  requireThat(bytes.byteLength > 0 && bytes.byteLength <= 16_777_216, "WASM artifact size bound");
  return { sha256: hashBytes(bytes), size: bytes.byteLength, exports: ABI };
}

/** Compile only inside the supervised build child. The parent binds bytes to
 * that child's report and the independent target comparison without compiling. */
function compiledWasmIdentity(bytes: Uint8Array): ReturnType<typeof wasmBinding> {
  const binding = wasmBinding(bytes);
  const module = new WebAssembly.Module(bytes.slice().buffer);
  requireThat(WebAssembly.Module.imports(module).length === 0, "expression WASM gained imports");
  const exports = WebAssembly.Module.exports(module).map(({ name, kind }) => ({ name, kind })).sort((a, b) => a.name < b.name ? -1 : a.name === b.name ? 0 : 1);
  requireThat(hashJson(exports) === hashJson(ABI), "expression WASM export inventory changed");
  return { ...binding, exports };
}

export function admitArtifactManifest(value: unknown, inputs: FileBinding[], bytes: Uint8Array): void {
  const item = record(value, ["contract", "recipe", "inputs", "wasm"], "expression artifact manifest");
  requireThat(item.contract === "algal.expression-artifact.v1", "unknown expression artifact manifest");
  requireThat(hashJson(item.recipe) === hashJson(RECIPE), "artifact recipe/toolchain differs");
  requireThat(hashJson(item.inputs) === hashJson(inputs), "stale expression source/lockfile/builder binding");
  // This admits a source/byte binding only. Executable/ABI qualification occurs
  // under the build and target-comparison process-group deadlines.
  requireThat(hashJson(item.wasm) === hashJson(wasmBinding(bytes)), "stale or altered expression WASM");
}

export async function admitCommittedArtifact(root: string): Promise<FileBinding[]> {
  const inputs = await artifactInputs(root);
  admitArtifactManifest(await readJson(root, MANIFEST), inputs, await readFileBounded(root, ARTIFACT, 16_777_216));
  return inputs;
}

/** Each invocation owns only the temporary it successfully created. These are
 * development artifacts; this helper makes no crash-durability claim. */
export async function publishArtifactFile(target: string, value: string | Uint8Array): Promise<void> {
  const temporary = `${target}.tmp-${randomUUID()}`;
  const file = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o644);
  try {
    await file.writeFile(value);
    await file.close();
    await rename(temporary, target);
  } finally {
    try { await file.close(); }
    finally { await rm(temporary, { force: true }); }
  }
}

/** Compiler files can exceed the ordinary source-file bound. */
async function binaryHash(path: string): Promise<string> {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const info = await file.stat();
    requireThat(info.isFile() && info.size <= 536_870_912, `${path}: tool file bound`);
    const hash = createHash("sha256");
    let total = 0;
    for (;;) {
      const chunk = Buffer.alloc(65_536);
      const { bytesRead } = await file.read(chunk);
      if (!bytesRead) break;
      requireThat((total += bytesRead) <= 536_870_912, "tool file grew beyond bound");
      hash.update(chunk.subarray(0, bytesRead));
    }
    return `sha256:${hash.digest("hex")}`;
  } finally { await file.close(); }
}

/** Only called inside the outer owned process group/deadline. */
async function command(argv: string[], cwd: string, env: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(argv[0]!, argv.slice(1), { cwd, env: childEnv(env), stdio: ["ignore", "pipe", "pipe"] });
    const stdout: Buffer[] = [], stderr: Buffer[] = [];
    let bytes = 0, exceeded = false;
    const receive = (chunks: Buffer[]) => (chunk: Buffer) => {
      if ((bytes += chunk.length) > 4_194_304) { exceeded = true; child.kill("SIGKILL"); return; }
      chunks.push(chunk);
    };
    child.stdout.on("data", receive(stdout)); child.stderr.on("data", receive(stderr));
    child.on("error", reject);
    child.on("close", (code, signal) => {
      try {
        const decoder = new TextDecoder("utf8", { fatal: true, ignoreBOM: true });
        const out = decoder.decode(Buffer.concat(stdout)), err = decoder.decode(Buffer.concat(stderr));
        requireThat(code === 0 && signal === null && !exceeded, `artifact command failed (${code}/${signal}): ${err.slice(-8192)}`);
        resolve(out);
      } catch (error) { reject(error); }
    });
  });
}

async function compilerFiles(toolchain: string, host: string): Promise<FileBinding[]> {
  const paths = ["bin/cargo", "bin/rustc", "bin/rustdoc"];
  for (const path of await inventory(toolchain, "lib")) {
    if (!path.includes("/rustlib/") || path.startsWith(`lib/rustlib/${host}/`) || path.startsWith(`lib/rustlib/${TARGET}/`)) paths.push(path);
  }
  return Promise.all([...new Set(paths)].sort().map(async path => ({ path, sha256: await binaryHash(join(toolchain, path)) })));
}

async function buildChild(root: string, toolchain: string, cache: string, stage: string): Promise<void> {
  const progress = async (step: string) => { await Bun.write(join(stage, "progress.json"), JSON.stringify({ step })); };
  await progress("input-and-compiler-inventory");
  const before = await artifactInputs(root);
  const home = join(stage, "home"), cargoHome = join(stage, "cargo-home");
  await mkdir(home); await mkdir(cargoHome);
  const env = { ...RECIPE.environment, HOME: home, CARGO_HOME: cargoHome, CARGO_TARGET_DIR: join(stage, "target"),
    PATH: `${toolchain}/bin:/usr/bin:/bin`, RUSTC: join(toolchain, "bin/rustc"), RUSTDOC: join(toolchain, "bin/rustdoc"),
    RUSTFLAGS: `--remap-path-prefix=${stage}=${RECIPE.remap.build} --remap-path-prefix=${toolchain}=${RECIPE.remap.toolchain}` };
  const version = await command([env.RUSTC, "-vV"], stage, env);
  requireThat(version.includes(`release: ${TOOLCHAIN}\n`) && version.includes(`commit-hash: ${RUST_COMMIT}\n`) && version.includes(`LLVM version: ${LLVM}\n`), "compiler does not match pinned release/commit/LLVM");
  const host = /^host: ([a-z0-9_-]+)$/m.exec(version)?.[1];
  requireThat(host !== undefined, "missing compiler host identity");
  const toolsBefore = await compilerFiles(toolchain, host);
  for (const input of before.filter(input => input.path === "Cargo.toml" || input.path === "Cargo.lock" || input.path.startsWith("crates/"))) {
    await mkdir(dirname(join(stage, input.path)), { recursive: true });
    await copyFile(join(root, input.path), join(stage, input.path));
    requireThat(await hashFile(stage, input.path) === input.sha256, "source changed during staging");
  }
  await mkdir(join(stage, "crates/algal/src"));
  await Bun.write(join(stage, "crates/algal/src/lib.rs"), "");
  // A fresh source cache forces Cargo to unpack checksum-bound registry archives.
  // Index/git metadata resolves the unbuilt workspace member, offline.
  await mkdir(join(cargoHome, "registry/cache"), { recursive: true });
  await symlink(join(cache, "registry/index"), join(cargoHome, "registry/index"));
  await symlink(join(cache, "git"), join(cargoHome, "git"));
  const registryNames = await readdir(join(cache, "registry/cache"));
  requireThat(registryNames.length > 0 && registryNames.length <= 32, "registry cache bound");
  let pinnedRegistry: string | undefined;
  for (const name of registryNames) {
    requireThat(/^[A-Za-z0-9._-]+$/.test(name), "registry directory name");
    const entries = await readdir(join(cache, "registry/cache", name));
    if (PACKAGES.every(([pkg, ver]) => entries.includes(`${pkg}-${ver}.crate`))) {
      requireThat(pinnedRegistry === undefined, "ambiguous expression archive registry"); pinnedRegistry = name;
    }
  }
  requireThat(pinnedRegistry !== undefined, "pinned dependency archives missing; run cargo fetch --locked first");
  for (const name of registryNames) await symlink(join(cache, "registry/cache", name), join(cargoHome, "registry/cache", name));
  await rm(join(cargoHome, "registry/cache", pinnedRegistry));
  await mkdir(join(cargoHome, "registry/cache", pinnedRegistry));
  const archiveNames = await readdir(join(cache, "registry/cache", pinnedRegistry));
  requireThat(archiveNames.length <= 10_000, "registry archive inventory bound");
  for (const name of archiveNames) {
    requireThat(/^[A-Za-z0-9._+-]+\.crate$/.test(name), "unexpected cached archive entry");
    const source = join(cache, "registry/cache", pinnedRegistry, name), target = join(cargoHome, "registry/cache", pinnedRegistry, name);
    const expected = PACKAGES.find(([pkg, ver]) => name === `${pkg}-${ver}.crate`);
    if (expected) {
      await copyFile(source, target);
      requireThat(await binaryHash(target) === `sha256:${expected[2]}`, `dependency archive checksum mismatch: ${name}`);
    } else await symlink(source, target);
  }
  await progress("wasm-build");
  const raw = await command([join(toolchain, "bin/cargo"), ...BUILD], stage, env);
  const messages = raw.trim().split("\n").map(line => JSON.parse(line) as Record<string, unknown>);
  requireThat(messages.filter(item => item.reason === "build-finished" && item.success === true).length === 1 && messages.at(-1)?.reason === "build-finished", "missing Cargo successful completion");
  const artifacts = messages.filter(item => item.reason === "compiler-artifact");
  const observedPackages = [...new Set(artifacts.map(item => String(item.package_id).split("#").at(-1)))].sort();
  const manifest = Bun.TOML.parse(new TextDecoder().decode(await readFileBounded(root, "Cargo.toml"))) as { workspace: { package: { version: string } } };
  const expressionId = manifest.workspace.package.version;
  const expressionPackage = `path+${pathToFileURL(join(stage, "crates/algal-expr")).href}#${expressionId}`;
  requireThat(artifacts.filter(item => item.package_id === expressionPackage).length === 1, `missing compiled expression crate at staged source path: ${JSON.stringify({ expected: expressionPackage, actual: artifacts.map(item => item.package_id) })}`);
  requireThat(hashJson(observedPackages) === hashJson([...PACKAGES.map(([pkg, ver]) => `${pkg}@${ver}`), expressionId].sort()), `compiled dependency closure differs from reviewed recipe: ${JSON.stringify(observedPackages)}`);
  requireThat(artifacts.every(item => item.fresh === false), "fresh isolated build unexpectedly reused an artifact");
  const built = await readFileBounded(stage, `target/${TARGET}/release/algal_expr.wasm`, 16_777_216);
  const wasm = compiledWasmIdentity(built);
  await progress("native-build");
  const nativeRaw = await command([join(toolchain, "bin/cargo"), ...NATIVE_BUILD], stage, env);
  const nativeMessages = nativeRaw.trim().split("\n").map(line => JSON.parse(line) as Record<string, unknown>);
  requireThat(nativeMessages.filter(item => item.reason === "build-finished" && item.success === true).length === 1 && nativeMessages.at(-1)?.reason === "build-finished", "missing native Cargo successful completion");
  const nativeArtifacts = nativeMessages.filter(item => item.reason === "compiler-artifact");
  requireThat(nativeArtifacts.every(item => item.fresh === false), "native comparison reused a prebuilt artifact");
  requireThat(hashJson([...new Set(nativeArtifacts.map(item => String(item.package_id).split("#").at(-1)))].sort()) === hashJson(observedPackages), "native dependency closure differs from reviewed recipe");
  const nativePath = join(stage, "target/debug/examples/verification_boundary");
  requireThat(nativeArtifacts.filter(item => item.package_id === expressionPackage && item.executable === nativePath).length === 1, "missing staged native comparison driver");
  await mkdir(join(stage, "src"));
  await Bun.write(join(stage, ARTIFACT), built);
  const dependencySources: FileBinding[] = [];
  for (const [name, version] of PACKAGES) {
    const path = `registry/src/${pinnedRegistry}/${name}-${version}`;
    const files = (await inventory(cargoHome, path)).filter(path => !path.endsWith("/.cargo-ok"));
    const bindings = await Promise.all(files.map(async path => ({ path: path.slice(`registry/src/${pinnedRegistry}/`.length), sha256: await hashFile(cargoHome, path) })));
    dependencySources.push({ path: `${name}-${version}`, sha256: hashJson(bindings) });
    requireThat(await binaryHash(join(cargoHome, "registry/cache", pinnedRegistry, `${name}-${version}.crate`)) === RECIPE.packages.find(item => item.name === name)!.sha256, "dependency archive changed during build");
  }
  await progress("final-input-and-compiler-inventory");
  requireThat(hashJson(before) === hashJson(await artifactInputs(root)), "expression inputs changed during build");
  requireThat(hashJson(toolsBefore) === hashJson(await compilerFiles(toolchain, host)), "compiler files changed during build");
  await Bun.write(join(stage, "built.wasm"), built);
  console.log(JSON.stringify({ contract: "algal.expression-build.v1", recipe: RECIPE, inputs: before, wasm, compiler: { host, version, files: toolsBefore }, dependencySources, cargoOutput: raw, cargoOutputSha256: hashBytes(raw), nativeCargoOutput: nativeRaw, nativeCargoOutputSha256: hashBytes(nativeRaw) }));
}

export async function runArtifact(root: string, mode: "build" | "check" = "check"): Promise<unknown> {
  requireThat(Bun.version === "1.3.14", "artifact builder requires Bun 1.3.14");
  requireThat(process.env.ALGAL_EXPR_TOOLCHAIN === undefined || process.env.ALGAL_EXPR_TOOLCHAIN === TOOLCHAIN, `ALGAL_EXPR_TOOLCHAIN must be ${TOOLCHAIN}`);
  const builderPath = await realpath(process.execPath);
  const builderRuntime = { path: builderPath, version: Bun.version, sha256: await binaryHash(builderPath), platform: process.platform, arch: process.arch };
  const inputs = mode === "check" ? await admitCommittedArtifact(root) : await artifactInputs(root);
  const rustup = Bun.which("rustup");
  requireThat(rustup !== null, "rustup is required for the pinned evaluator build");
  const located = await runCommand([rustup, "which", "--toolchain", TOOLCHAIN, "rustc"], root);
  requireSuccess(located);
  requireThat(located.stdout.endsWith("\n") && located.stdout.trim().split("\n").length === 1, "invalid rustup compiler path");
  const toolchain = dirname(dirname(await realpath(located.stdout.trim())));
  const cache = await realpath(process.env.CARGO_HOME ?? join(homedir(), ".cargo"));
  const stage = await realpath(await mkdtemp(join(tmpdir(), "algal-expression-build-")));
  let cleanupObserved = true;
  try {
    cleanupObserved = false;
    const result = await runCommand([process.execPath, join(root, "verify/artifact/run.ts"), "--child", root, toolchain, cache, stage], root, { timeoutMs: 120_000, maxOutputBytes: 4_194_304 });
    cleanupObserved = result.cleanupObserved;
    requireSuccess(result);
    const report = record(JSON.parse(result.stdout) as unknown, ["contract", "recipe", "inputs", "wasm", "compiler", "dependencySources", "cargoOutput", "cargoOutputSha256", "nativeCargoOutput", "nativeCargoOutputSha256"], "expression build report");
    requireThat(report.contract === "algal.expression-build.v1" && hashJson(report.recipe) === hashJson(RECIPE) && hashJson(report.inputs) === hashJson(inputs), "mismatched build definition");
    const bytes = await readFileBounded(stage, "built.wasm", 16_777_216);
    requireThat(hashJson(report.wasm) === hashJson(wasmBinding(bytes)), "build summary/artifact mismatch");
    // Compilation and target comparison each receive an independent bounded
    // command. Neither can spend the other's deadline or run without custody.
    await Bun.write(join(stage, "progress.json"), JSON.stringify({ step: "native-wasm-boundary" }));
    cleanupObserved = false;
    const comparison = await runCommand([process.execPath, join(root, "verify/artifact/run.ts"), "--targets", stage], root, { timeoutMs: 120_000, maxOutputBytes: 1_048_576 });
    cleanupObserved = comparison.cleanupObserved;
    requireSuccess(comparison);
    const targets = JSON.parse(comparison.stdout) as Awaited<ReturnType<typeof runBoundary>>;
    admitBoundarySummary(targets);
    requireThat(targets.wasm.sha256 === hashBytes(bytes) && targets.native.sha256 === await binaryHash(join(stage, "target/debug/examples/verification_boundary")), "comparison did not use the built artifacts");
    const compiler = record(report.compiler, ["host", "version", "files"], "compiler identity");
    requireThat(typeof compiler.host === "string" && typeof compiler.version === "string", "missing compiler identity");
    array(compiler.files, "compiler files", 1, 20_000);
    array(report.dependencySources, "dependency source digests", PACKAGES.length, PACKAGES.length);
    digest(report.cargoOutputSha256, "Cargo output digest");
    requireThat(typeof report.cargoOutput === "string" && hashBytes(report.cargoOutput) === report.cargoOutputSha256, "Cargo output digest mismatch");
    digest(report.nativeCargoOutputSha256, "native Cargo output digest");
    requireThat(typeof report.nativeCargoOutput === "string" && hashBytes(report.nativeCargoOutput) === report.nativeCargoOutputSha256, "native Cargo output digest mismatch");
    requireThat(hashJson(inputs) === hashJson(await artifactInputs(root)), "expression inputs changed after build");
    requireThat(builderRuntime.sha256 === await binaryHash(builderPath), "Bun artifact builder changed during execution");
    const manifest = { contract: "algal.expression-artifact.v1", recipe: RECIPE, inputs, wasm: report.wasm };
    if (mode === "check") {
      const retained = await readFileBounded(root, ARTIFACT, 16_777_216);
      if (!Buffer.from(retained).equals(Buffer.from(bytes))) {
        // Keep the freshly produced bytes for forensics when the platform
        // asks for them, then fail closed as before.
        const capture = process.env.ALGAL_EXPR_REPRODUCED_OUT;
        if (typeof capture === "string" && capture.length > 0 && capture.length <= 4096) {
          await Bun.write(await realpath(dirname(capture)).then(dir => join(dir, basename(capture))), bytes);
        }
        requireThat(false, `reproduced WASM differs from committed bytes (produced ${hashBytes(bytes)}, committed ${hashBytes(retained)})`);
      }
      admitArtifactManifest(await readJson(root, MANIFEST), inputs, retained);
    } else {
      // An interruption between the source writes leaves a stale manifest,
      // which check rejects rather than licensing a mismatched artifact.
      for (const [path, value] of [[ARTIFACT, bytes], [MANIFEST, JSON.stringify(manifest, null, 2) + "\n"]] as const) {
        await publishArtifactFile(join(root, path), value);
      }
    }
    const artifact = record(report.wasm, ["sha256", "size", "exports"], "WASM identity");
    digest(artifact.sha256, "WASM digest"); natural(artifact.size, "WASM size");
    return { ...report, targets, builderRuntime, mode, reproducedCommittedBytes: mode === "check", process: { exitCode: result.exitCode, cleanupObserved: result.cleanupObserved, comparisonExitCode: comparison.exitCode, comparisonCleanupObserved: comparison.cleanupObserved },
      scope: "Exact-byte build of the specified expression source closure. Compiler, build scripts, system libraries, Cargo archive admission and OS execution are trusted; no semantic compiler-correctness proof." };
  } catch (error) {
    let progress: unknown = "unavailable";
    try { progress = await readJson(stage, "progress.json"); } catch { /* preserve primary error */ }
    if (error instanceof CommandFailure) {
      try {
        await Bun.write(join(stage, "failed-stdout.log"), error.rawStdout);
        await Bun.write(join(stage, "failed-stderr.log"), error.rawStderr);
        await Bun.write(join(stage, "command-failure.json"), JSON.stringify(error.observation));
      } catch { /* preserve primary custody failure */ }
    }
    throw new Error(`${error instanceof Error ? error.message : String(error)}; build progress=${JSON.stringify(progress)}${cleanupObserved ? "" : `; cleanup unobserved, scratch retained at ${stage}`}`);
  } finally {
    // Without observed closure this namespace can still have a live writer.
    // Retain it and diagnostics instead of racing an uncollected process.
    if (cleanupObserved) await rm(stage, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const task = args[0] === "--child" && args.length === 5
    ? buildChild(resolve(args[1]!), resolve(args[2]!), resolve(args[3]!), resolve(args[4]!))
    : args[0] === "--targets" && args.length === 2
      ? runBoundary(resolve(args[1]!), join(resolve(args[1]!), "target/debug/examples/verification_boundary")).then(result => { console.log(JSON.stringify(result)); })
      : (async () => {
      requireThat(args.length === 1 && (args[0] === "build" || args[0] === "check"), "usage: bun verify/artifact/run.ts <build|check>");
      console.log(JSON.stringify(await runArtifact(resolve(import.meta.dir, "../.."), args[0]), null, 2));
    })();
  task.catch((error: unknown) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
