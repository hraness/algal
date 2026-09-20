import { expect, test } from "bun:test";
import { createSourceTrace, resolveSourcePath, SOURCE_TRACE_BOUNDS, type SourceTraceContext } from "./source-trace";
import { compileSource } from "./source";
import { manifestToJson } from "./contract";
import { MemoryStore } from "./store";
import { builtinRegistry } from "./registry";
import { runOrganism } from "./run";

const child = 'program ratio(input: json) -> json { budget { max_agent_calls: 0 } return input.numerator / input.denominator }';
const root = `import ratio from "./ratio.algal"
program ratios(items: json) -> json { budget { max_agent_calls: 0 }
  return each ratio over input in items using {} max_items 3
}`;

test("trace resolves exact nested each failure to source and callers without changing receipts", async () => {
  const context = createSourceTrace(root, { entry: "app/ratios.algal", modules: { "app/ratio.algal": child } });
  const store = new MemoryStore();
  for (const manifest of context.compilation.modules) await store.putManifest(manifest);
  const receipt = await runOrganism({ manifest: context.compilation.manifest, args: { input: { items: [{ numerator: 8, denominator: 2 }, { numerator: 3, denominator: 0 }] } }, fns: builtinRegistry(), store, executors: [] });
  expect(receipt.outcome).toBe("failed");
  const before = JSON.stringify(receipt);
  const found = resolveSourcePath(context, receipt.failure!.path!, "cell");
  expect(found.ok).toBe(true);
  if (!found.ok) return;
  expect(found.source).toBe("app/ratio.algal"); expect(found.cell?.id).toBe("result");
  expect(found.invocationPath).toBe("result-each/i1");
  expect(found.location?.role).toBe("expression");
  expect(context.sources[found.source!]?.slice(found.location!.span.start.offset, found.location!.span.end.offset)).toBe("input.numerator / input.denominator");
  expect(found.frames).toHaveLength(1);
  expect(found.frames[0]?.path).toBe("result-each/i1"); expect(found.frames[0]?.index).toBe(1);
  expect(found.frames[0]?.location?.source).toBe("app/ratios.algal");
  expect(JSON.stringify(receipt)).toBe(before);
  const invocation = resolveSourcePath(context, "result-each/i1", "invocation");
  expect(invocation.ok && invocation.manifestDigest).toBe(found.manifestDigest);
  expect(invocation.ok && invocation.cell).toBeUndefined();
  // A bounded static path is resolvable even when this receipt never ran it.
  expect(resolveSourcePath(context, "result-each/i2/result", "cell").ok).toBe(true);
});

test("source keys disambiguate identical child digests and preserve call-site names", () => {
  const program = `import first from "./first.algal" import second from "./second.algal"
    program paired(value: json) -> json { budget { max_agent_calls: 0 }
      let a = call first using {input: value}
      return call second using {input: a}
    }`;
  const context = createSourceTrace(program, { modules: { "first.algal": child, "second.algal": `// a different file\n${child}` } });
  expect(context.compilation.modules).toHaveLength(1);
  const first = resolveSourcePath(context, "b1-a/result", "cell");
  const second = resolveSourcePath(context, "result/result", "cell");
  expect(first.ok && first.source).toBe("first.algal");
  expect(second.ok && second.source).toBe("second.algal");
  expect(first.ok && second.ok && first.manifestDigest === second.manifestDigest).toBe(true);
  expect(first.ok && first.location?.span.start.line).toBe(1);
  expect(second.ok && second.location?.span.start.line).toBe(2);
});

test("generated wrapper boundaries remain exact without fabricated source maps", () => {
  const source = `import ping from "./ping.algal" program outer(flag: json) -> text {
    budget { max_agent_calls: 0 } return if flag { call ping using {} } else { "skip" }
  }`;
  const context = createSourceTrace(source, { modules: { "ping.algal": 'program ping() -> text { budget { max_agent_calls: 0 } return "pong" }' } });
  const outer = resolveSourcePath(context, "branch-1-arm-1", "cell");
  expect(outer.ok && outer.source).toBe("main.algal");
  const wrapper = resolveSourcePath(context, "branch-1-arm-1", "invocation");
  expect(wrapper.ok && wrapper.generated).toBe(true); expect(wrapper.ok && wrapper.sourceMap).toBeUndefined();
  const wrapperCell = resolveSourcePath(context, "branch-1-arm-1/call", "cell");
  expect(wrapperCell.ok && wrapperCell.location).toBeUndefined();
  const inner = resolveSourcePath(context, "branch-1-arm-1/call/result", "cell");
  expect(inner.ok && inner.source).toBe("ping.algal");
  expect(inner.ok && inner.frames.map(frame => frame.path)).toEqual(["branch-1-arm-1", "branch-1-arm-1/call"]);
  expect(inner.ok && inner.frames[0]?.location?.source).toBe("main.algal");
  expect(inner.ok && inner.frames[1]?.location).toBeUndefined();
});

test("trace walks nested each and ordinary call boundaries using actual cell kinds", () => {
  const middle = `import ratio from "./ratio.algal" program middle(value: json) -> json { budget { max_agent_calls: 0 }
    return call ratio using {input: value}
  }`;
  const top = `import middle from "./middle.algal" program top(rows: json) -> json { budget { max_agent_calls: 0 }
    return each middle over value in rows using {} max_items 2
  }`;
  const context = createSourceTrace(top, { modules: { "middle.algal": middle, "ratio.algal": child } });
  const found = resolveSourcePath(context, "result-each/i0/result/result", "cell");
  expect(found.ok && found.source).toBe("ratio.algal");
  expect(found.ok && found.frames.map(frame => frame.kind)).toEqual(["each", "call"]);
  expect(found.ok && found.frames.map(frame => frame.location?.source)).toEqual(["main.algal", "middle.algal"]);
  expect(resolveSourcePath(context, "result-each/i0/result", "invocation").ok).toBe(true);
  expect(resolveSourcePath(context, "result-each/i0/result/i0/result", "cell").ok).toBe(false);
});

test("malformed and out-of-bound paths return explicit unresolved results", () => {
  const context = createSourceTrace(root, { modules: { "ratio.algal": child } });
  for (const path of ["/result", "result/", "result//x", "../result", "missing", "result/input", "result-each/i1", "result-each/i01/result", "result-each/i-1/result", "result-each/i3/result", "result-each/r0/result", "result-each/i9007199254740992/result", "result-each/i0/missing", "result-each/i0/result/child", "x".repeat(SOURCE_TRACE_BOUNDS.maxPathLength + 1)]) {
    const found = resolveSourcePath(context, path, "cell");
    expect(found.ok, path).toBe(false);
    if (!found.ok) expect(found.reason.length).toBeGreaterThan(0);
    expect("location" in found).toBe(false);
  }
  expect(resolveSourcePath(context, "", "cell").ok).toBe(false);
  expect(resolveSourcePath(context, "result-each", "cell").ok).toBe(true);
  expect(resolveSourcePath(context, "result-each", "invocation").ok).toBe(false);
  const rootView = resolveSourcePath(context, "", "invocation");
  expect(rootView.ok && rootView.source).toBe("main.algal");
  expect(rootView.ok && rootView.frames).toEqual([]);
});

test("trace only accepts immutable compiler-derived contexts", () => {
  const options = { modules: { "ratio.algal": child } };
  const context = createSourceTrace(root, options);
  options.modules["ratio.algal"] = "changed";
  expect(context.sources["ratio.algal"]).toBe(child);
  expect(Object.isFrozen(context.compilation.project.calls)).toBe(true);
  expect(() => { context.compilation.project.calls[0]!.childSource = "forged.algal"; }).toThrow();
  const imported = structuredClone(context) as SourceTraceContext;
  expect(resolveSourcePath(imported, "result-each/i0/result", "cell").ok).toBe(false);
  const result = resolveSourcePath(context, "result-each/i0/result", "cell");
  expect(result.ok).toBe(true);
  expect(manifestToJson(context.compilation.manifest)).toEqual(manifestToJson(compileSource(root, { modules: { "ratio.algal": child } }).manifest));
});
