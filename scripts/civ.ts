import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const binary = process.env.ALGAL_BIN ?? resolve(root, "target/debug/algal");
if (!await Bun.file(binary).exists()) {
  console.error("Build the native engine first: cargo build --locked");
  process.exit(2);
}
const args = process.argv.slice(2);
if (args.includes("--live") && process.env.GATEWAY_MODEL && !args.includes("--gateway-model") && !args.includes("--host")) {
  args.push("--gateway-model", process.env.GATEWAY_MODEL);
}
const child = Bun.spawn([binary, "civ", ...args], {
  cwd: root, stdin: "inherit", stdout: "inherit", stderr: "inherit",
});
process.exitCode = await child.exited;
