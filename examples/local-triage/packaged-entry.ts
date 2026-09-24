/** Bun's file loader embeds these exact evaluator bytes in the standalone host. */
// @ts-expect-error Bun's native file loader handles this non-TypeScript asset.
import evaluator from "../../src/algal_expr.wasm" with { type: "file" };
import { setExprExports, type EvalExports } from "../../src/expr";
import { main } from "./run";

const bytes = await Bun.file(evaluator as string).arrayBuffer();
setExprExports(new WebAssembly.Instance(new WebAssembly.Module(bytes), {}).exports as unknown as EvalExports);
await main();
