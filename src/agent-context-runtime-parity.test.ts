import { expect, test } from "bun:test";
import fixture from "../scripts/fixtures/agent-local-context.json";
import { LOCAL_AGENT_CONTEXT_TOOL, prepareLocalAgentContext } from "./agent-context-runtime";
import { MemoryStore } from "./store";
import type { JsonValue } from "./values";

test("local context matches the shared native fixture", async () => {
  const prepared = await prepareLocalAgentContext({ store: new MemoryStore(), ...fixture.source, remainingWork: 1_000_000 });
  const tool = prepared.tools.get(LOCAL_AGENT_CONTEXT_TOOL)!;
  expect(prepared.work).toBe(fixture.expected.work);
  expect(prepared.prompt).toBe(fixture.expected.prompt);
  expect(fixture.expected.configurationDigest).toBe(tool.configurationDigest!);
  for (const item of fixture.expected.cases) {
    try {
      const result = await tool.tool({ query: item.query as JsonValue }, { requestDigest: `sha256:${"a".repeat(64)}`, idempotencyKey: `sha256:${"b".repeat(64)}` });
      expect(item.output as JsonValue).toEqual(result);
      expect(item.error).toBeUndefined();
    } catch (error) {
      expect(item.error).toEqual({ code: (error as { code: string }).code, message: (error as Error).message });
      expect(item.output).toBeUndefined();
    }
  }
});
