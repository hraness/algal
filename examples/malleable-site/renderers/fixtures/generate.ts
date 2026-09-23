/** Keep the renderer input tied to the real ALGAL view program, not a mock. */
import { DEFAULT_CONFIG, DEFAULT_SIGNALS, evaluateView, makeRevision } from "../../surface";

const fixture = new URL("./view.json", import.meta.url);
const expected = JSON.stringify(evaluateView(makeRevision(DEFAULT_CONFIG), DEFAULT_SIGNALS), null, 2) + "\n";
if (Bun.argv.slice(2).join(" ") === "--write") {
  await Bun.write(fixture, expected);
} else if (Bun.argv.slice(2).join(" ") === "--check") {
  if (await Bun.file(fixture).text() !== expected) throw new Error("Renderer fixture differs from the ALGAL view program; regenerate deliberately");
  console.log("Renderer fixture matches the ALGAL view program");
} else {
  throw new Error("usage: bun fixtures/generate.ts --check | --write");
}
