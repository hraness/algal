import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { applicationJson, applicationRef } from "../../src/application-contract";
import { NativeMemoryQueryEngine } from "../../src/application-native-memory";
import { createGatewayInference } from "../coding-harness/model";
import { hash, makePlan, prepareStudy, readPlan, runStudy, verifyStudy } from "./study";

/** These host-admitted ceilings were selected before live outcomes. This
 * command admits only this reviewed model/provider/rate tuple, not arbitrary
 * model names priced using a cheaper model's ceilings. */
export const GATEWAY_STUDY = { model: "anthropic/claude-haiku-4.5", gatewayProvider: "anthropic", maxInputTokens: 32768, maxOutputTokens: 2048, inputMicrousdPerToken: 2, outputMicrousdPerToken: 6, maxRequestBytes: 16384, maxOutputBytes: 2048, timeoutMs: 120000 };
const RESERVATION = GATEWAY_STUDY.maxInputTokens * GATEWAY_STUDY.inputMicrousdPerToken + GATEWAY_STUDY.maxOutputTokens * GATEWAY_STUDY.outputMicrousdPerToken;

if (import.meta.main) {
  const [command, directory, ...args] = process.argv.slice(2);
  if (!directory || !["plan", "run", "verify"].includes(command ?? "")) throw new Error("Usage: ALGAL_MEMORY_NATIVE=/absolute/algal bun examples/application-research/run.ts plan|run|verify NEW_DIRECTORY [--gateway-model anthropic/claude-haiku-4.5] [--max-cost-microusd 1500000] [--trusted-evaluator sha256:...]");
  const flags = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index]!, value = args[index + 1];
    if (!["--gateway-model", "--max-cost-microusd", "--trusted-evaluator"].includes(flag) || !value || flags.has(flag)) throw new Error("Unknown, duplicated, or incomplete study option");
    flags.set(flag, value);
  }
  const executable = process.env.ALGAL_MEMORY_NATIVE; if (!executable) throw new Error("ALGAL_MEMORY_NATIVE must name the pinned local native executable");
  const engine = new NativeMemoryQueryEngine({ executable: resolve(executable), expectedSha256: createHash("sha256").update(await readFile(executable)).digest("hex") });
  const root = resolve(directory);
  try {
    if (command === "plan") {
      const model = flags.get("--gateway-model") ?? GATEWAY_STUDY.model;
      if (model !== GATEWAY_STUDY.model) throw new Error("Model has no reviewed provider/price bounds in this study");
      if (flags.has("--trusted-evaluator")) throw new Error("plan does not accept a verifier option");
      const maxCostMicrousd = Number(flags.get("--max-cost-microusd") ?? 1_500_000);
      const backend = await createGatewayInference({ ...GATEWAY_STUDY, ledgerPath: `${root}.inference-ledger`, maxCalls: 17, maxCostMicrousd });
      const plan = makePlan({ provenance: "live", model, engine: engine.identity, executorConfiguration: applicationRef(backend.accounting.configurationDigest), maxCostMicrousd, reserveMicrousdPerCall: RESERVATION });
      await backend.settle();
      const reference = await prepareStudy(root, plan);
      console.log(JSON.stringify({ plan: reference, path: join(root, "plan.json"), maxCalls: 17, reservationCeilingMicrousd: 17 * RESERVATION, dispatched: 0 }));
    } else if (command === "run") {
      if (flags.size) throw new Error("run accepts only the previously frozen plan, with no overrides");
      const plan = await readPlan(root);
      if (plan.provenance !== "live" || plan.model !== GATEWAY_STUDY.model || plan.reserveMicrousdPerCall !== RESERVATION) throw new Error("Plan differs from the admitted Gateway study");
      const backend = await createGatewayInference({ ...GATEWAY_STUDY, ledgerPath: `${root}.inference-ledger`, maxCalls: plan.maxCalls, maxCostMicrousd: plan.maxCostMicrousd });
      if (backend.accounting.configurationDigest !== plan.executorConfiguration || backend.accounting.calls !== 0) throw new Error("Live run requires its frozen, unused inference ledger");
      try { console.log(JSON.stringify(await runStudy(root, { executor: backend.executor, engine, accounting: async () => { await backend.settle(); return applicationJson(backend.accounting); } }))); }
      finally { await backend.settle(); }
    } else {
      if (flags.size !== 1 || !flags.has("--trusted-evaluator")) throw new Error("verify requires the evaluator fingerprint retained before provider dispatch");
      const result = await verifyStudy(root, { engine, trustedEvaluator: applicationRef(flags.get("--trusted-evaluator")) });
      console.log(JSON.stringify({ verified: true, plan: hash(await readPlan(root)), result }));
    }
  } finally { await engine.settle(); }
}
