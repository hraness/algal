import { resolve } from "node:path";
import { LIVE_SOURCES, type TlcSuite } from "./definitions";
import { runTlcSuite } from "../lib/tlc";

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--suite" || !Object.hasOwn(LIVE_SOURCES, args[1]!)) throw new Error(`usage: bun verify/tla/run.ts --suite ${Object.keys(LIVE_SOURCES).join("|")}`);
  const root = resolve(import.meta.dir, "../..");
  console.log(JSON.stringify(await runTlcSuite(root, args[1] as TlcSuite)));
}
