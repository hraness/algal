import { expect, test } from "bun:test";
import { serializeMarketingJson } from "./copy";

test("canonical marketing JSON cannot close its script text boundary", () => {
  const copy = '</script><script>alert("copy")</script> & "quoted"';
  const encoded = serializeMarketingJson(copy);
  expect(encoded).not.toContain("<");
  expect(JSON.parse(encoded)).toBe(copy);
});
