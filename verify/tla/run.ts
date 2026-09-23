import { resolve } from "node:path";
import { runTlcSuite } from "../lib/tlc";

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--suite" || !["custody", "publication"].includes(args[1]!)) throw new Error("usage: bun verify/tla/run.ts --suite custody|publication");
  const root = resolve(import.meta.dir, "../..");
  console.log(JSON.stringify(await runTlcSuite(root, args[1] as "custody" | "publication")));
}
