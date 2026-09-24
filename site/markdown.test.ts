import { expect, test } from "bun:test";
import { DESCRIPTION_MAX, describeParagraph, renderMarkdown } from "./markdown";

const long = "The native process VM can run without Bun, Cargo, or a repository checkout. For a one-binary tour with a passive HTML workbench, start with the [native workbench](native-workbench.md). Packages are prereleases.";

test("descriptions keep link labels and drop their targets", () => {
  const description = describeParagraph("Start with the [native workbench](native-workbench.md) and `algal doctor`.");
  expect(description).toBe("Start with the native workbench and algal doctor.");
  expect(renderMarkdown(`# Title\n\n${long}\n`).description).not.toContain(".md");
});

test("descriptions end on a sentence boundary within the limit", () => {
  const description = describeParagraph(long);
  expect(description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  expect(description).toBe("The native process VM can run without Bun, Cargo, or a repository checkout.");
});

test("a first sentence over the limit is cut at a word boundary, never mid-word", () => {
  const words = Array.from({ length: 60 }, (_, index) => `word${index}`).join(" ");
  const description = describeParagraph(`${words}.`);
  expect(description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  expect(description).toEndWith("…");
  expect(description).not.toEndWith(".…");
  const lastWord = description.slice(0, -1).split(" ").at(-1)!;
  expect(words.split(" ")).toContain(lastWord);
});

test("a paragraph that ends on a colon does not become a colon-ended description", () => {
  const description = describeParagraph("Binary packages are tested on two targets:");
  expect(description).not.toMatch(/:$/);
  expect(description).toBe("Binary packages are tested on two targets…");
});
