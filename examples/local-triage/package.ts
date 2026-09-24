/** Local macOS artifact assembly. Invoke through the host mac-native lane. */
import { chmod, copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { release } from "node:os";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../.."), args = process.argv.slice(2);
let output = join(root, "examples/local-triage/dist"), target = join(root, "examples/malleable-site/renderers/target"), native: string | null = null, bridge: string | null = null, skipRust = false;
for (let i = 0; i < args.length; i++) {
  const value = args[i];
  if (value === "--output") output = resolve(args[++i] ?? "");
  else if (value === "--target-dir") target = resolve(args[++i] ?? "");
  else if (value === "--native") native = resolve(args[++i] ?? "");
  else if (value === "--bridge") bridge = resolve(args[++i] ?? "");
  else if (value === "--skip-rust") skipRust = true;
  else throw new Error(`Unknown package argument ${value}`);
}
if (process.platform !== "darwin" || process.arch !== "arm64") throw new Error("This package target requires macOS arm64");
if (!!native !== !!bridge) throw new Error("Explicit --native and --bridge paths must be supplied together");
const label = "algal-triage-macos-arm64", directory = join(output, label), app = join(directory, "ALGAL Triage.app"), bin = join(directory, "bin"), resources = join(app, "Contents/Resources/bin");
try { await stat(directory); throw new Error("Package directory already exists; choose a fresh --output directory. Existing artifacts are never overwritten."); } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
await mkdir(resources, { recursive: true }); await mkdir(join(app, "Contents/MacOS"), { recursive: true }); await mkdir(bin, { recursive: true });
async function command(argv: string[]): Promise<void> {
  const child = Bun.spawn(argv, { cwd: root, stdin: "ignore", stdout: "inherit", stderr: "inherit" });
  if (await child.exited !== 0) throw new Error(`Package command failed: ${argv[0]}`);
}
async function commandText(argv: string[]): Promise<string> {
  const child = Bun.spawn(argv, { cwd: root, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  if (code !== 0) throw new Error(`Package provenance failed: ${argv[0]}: ${stderr.slice(0, 4096)}`);
  if (stdout.length > 1_048_576) throw new Error("Package provenance output exceeded bound");
  return stdout.trim();
}
async function sourceSnapshot() {
  const patterns = ["package.json", "bun.lock", "tsconfig.json", "src/**/*.ts", "src/algal_expr.wasm", "examples/local-triage/*.ts", "examples/local-triage/session-compatibility-fixtures.json", "examples/local-triage/renderers/src/**/*.rs", "examples/local-triage/renderers/Cargo.toml", "examples/local-triage/renderers/Cargo.lock", "examples/local-triage/renderers/fixture.json", "examples/local-triage-web/*.ts", "examples/local-triage-inference/*.ts"];
  const paths = new Set<string>();
  for (const pattern of patterns) for await (const path of new Bun.Glob(pattern).scan({ cwd: root, onlyFiles: true })) paths.add(path);
  const files = await Promise.all([...paths].sort().map(async path => { const bytes = await readFile(join(root, path)); return { path, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") }; }));
  return { scope: "declared-source-superset-including-tests", patterns, sha256: createHash("sha256").update(JSON.stringify(files)).digest("hex"), files };
}
const source = await sourceSnapshot();
const provenance = { gitHead: await commandText(["/usr/bin/git", "rev-parse", "HEAD"]), gitWorktreeDirty: (await commandText(["/usr/bin/git", "status", "--porcelain"])).length > 0, bunVersion: Bun.version, rustcVersion: await commandText([join(process.env.HOME ?? "", ".cargo/bin/rustc"), "--version"]), cargoVersion: await commandText([join(process.env.HOME ?? "", ".cargo/bin/cargo"), "--version"]), darwinRelease: release(), rendererBuild: skipRust ? "reuse-existing-explicitly-requested" : "cargo build --locked --offline --features desktop (debug)", hostBuild: "bun build --compile --target=bun-darwin-arm64", bundledInferenceSourceRebuilt: false, source };
if (!skipRust) await command([join(process.env.HOME ?? "", ".cargo/bin/cargo"), "build", "--manifest-path", join(root, "examples/local-triage/renderers/Cargo.toml"), "--locked", "--offline", "--features", "desktop", "--target-dir", target]);
await command([process.execPath, "build", join(root, "examples/local-triage/packaged-entry.ts"), "--compile", "--target=bun-darwin-arm64", "--outfile", join(bin, "triage-host")]);
await copyFile(join(target, "debug/triage-desktop"), join(app, "Contents/MacOS/triage-desktop"));
await copyFile(join(target, "debug/triage-tui"), join(bin, "triage-tui"));
await copyFile(join(bin, "triage-host"), join(resources, "triage-host"));
if (native && bridge) {
  for (const [source, name] of [[native, "algal-native"], [bridge, "algal-apple"]] as const) {
    const info = await stat(source); if (!info.isFile() || info.size > 268_435_456 || !(info.mode & 0o111)) throw new Error("Bundled inference path is not a bounded executable");
    await copyFile(source, join(bin, name)); await copyFile(source, join(resources, name));
  }
}
const plist = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>CFBundleExecutable</key><string>triage-desktop</string><key>CFBundleIdentifier</key><string>computer.algal.triage</string><key>CFBundleName</key><string>ALGAL Triage</string><key>CFBundleDisplayName</key><string>ALGAL Triage</string><key>CFBundlePackageType</key><string>APPL</string><key>CFBundleVersion</key><string>1</string><key>CFBundleShortVersionString</key><string>0.1.0</string><key>LSMinimumSystemVersion</key><string>14.0</string><key>NSHighResolutionCapable</key><true/></dict></plist>`;
await writeFile(join(app, "Contents/Info.plist"), plist);
const executablePaths = ["bin/triage-host", "bin/triage-tui", "ALGAL Triage.app/Contents/MacOS/triage-desktop", "ALGAL Triage.app/Contents/Resources/bin/triage-host", ...(native ? ["bin/algal-native", "bin/algal-apple", "ALGAL Triage.app/Contents/Resources/bin/algal-native", "ALGAL Triage.app/Contents/Resources/bin/algal-apple"] : [])];
for (const path of executablePaths) await chmod(join(directory, path), 0o755);
await command(["/usr/bin/codesign", "--force", "--sign", "-", "--deep", app]);
const readme = `# ALGAL Triage — macOS arm64\n\nOpen ALGAL Triage.app for the Dioxus desktop app, or run bin/triage-tui in a terminal.\nBoth use the standalone bin/triage-host; no source checkout or Bun installation is required.\nFor the same application in a browser, run bin/triage-host DIRECTORY APPLICATION serve and open its local owner URL. Initialize a new identity with init first. Keep the owner URL private.\n\nDefault state: ~/Library/Application Support/ALGAL Triage\nOptional args: --dir DIRECTORY --application ID --host EXECUTABLE\nUse a separate directory for experiments. Existing state is preserved on errors.\n\n32 tasks / 128 lifecycle states per identity. Save drafts before closing.\nExact-head commands, retained receipts, explicit migration and authority-free forks.\nDesktop uses the system WebView; this local artifact is ad-hoc signed, not notarized.\n${native ? "Apple native runtime and bridge are bundled in bin/ and the app Resources/bin/. Apple Intelligence requires a supported Apple Silicon Mac, macOS 26+, enabled Apple Intelligence and downloaded model assets. No cloud fallback.\n" : "This build does not bundle an inference provider. Explicit proposal import remains available.\n"}\nCLI: bin/triage-host DIRECTORY APPLICATION init|capture|command|propose-evaluate|adopt|export|verify|import|fork|review-merge|adopt-merge|load-session|save-session|propose-apple|serve ...\n\nIn the TUI: n add, e edit, p priority, c category, space complete/reopen, f filter, / query, Ctrl-S save draft, Ctrl-R refresh, r rebase, v preview, a adopt, S/G/V/R adjust policy, d transfer path, x export, o import, b fork, i proposal import, q save and quit.\n\nAll required byte hashes, source inventory, build provenance and platform requirements are in manifest.json. Content hashes identify the exact artifact; they do not establish publisher authentication.\n`;
await writeFile(join(directory, "README.md"), readme);
const files = [...executablePaths, "ALGAL Triage.app/Contents/Info.plist", "README.md"];
const rows = await Promise.all(files.sort().map(async path => { const bytes = await readFile(join(directory, path)); return { path, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") }; }));
const evaluator = await readFile(join(root, "src/algal_expr.wasm"));
if ((await sourceSnapshot()).sha256 !== source.sha256) throw new Error("Package sources changed during assembly; keep this partial artifact and rebuild into a fresh output directory");
const manifest = { contract: "algal.triage-package.v1", platform: "macos-arm64", hostRuntime: "embedded-bun", renderer: "dioxus-system-webview-and-ratatui", minimumMacOS: "14.0", appleInferenceBundled: native !== null, inferenceMinimumMacOS: native ? "26.0" : null, networkFallback: false, signing: "ad-hoc-not-notarized", evaluatorSha256: createHash("sha256").update(evaluator).digest("hex"), provenance, files: rows };
await writeFile(join(directory, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
await command(["/usr/bin/tar", "-czf", join(output, `${label}.tar.gz`), "-C", output, label]);
console.log(JSON.stringify({ directory, archive: join(output, `${label}.tar.gz`), sourceSha256: source.sha256, manifest: join(directory, "manifest.json"), archiveBytes: (await stat(join(output, `${label}.tar.gz`))).size }));
