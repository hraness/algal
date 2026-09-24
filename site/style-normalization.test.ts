import { expect, test } from "bun:test";
import { normalizeSitePatternResets } from "./style-normalization";

const selectors = ["-webkit-any", "-moz-any", "is"].map(name =>
  `:${name}([data-hraness-pattern=cells],[data-hraness-pattern=weave],[data-hraness-pattern=contour],[data-hraness-pattern=mesh])`);
const family = selectors.map(selector => `${selector}{--hraness-material-wall-images:initial;--hraness-pattern-decoration:initial}`).join("");
const layer = (body: string): string => `@layer components.hraness-design-kit.legacy{${body}}`;
const none = "[data-hraness-pattern=none]{--hraness-pattern-decoration:none;--hraness-material-wall-images:none}";

test("duplicate reset normalization preserves the first rule and every other byte", () => {
  const middle = `${none}.art{background:url("data:image/svg+xml,<svg>{};</svg>");content:'}';--other:value}`;
  const before = `${layer(family + middle)}${layer(`.palette{color:red}${family}.tail{color:blue}`)}`;
  const expected = `${layer(family + middle)}${layer(".palette{color:red}.tail{color:blue}")}`;
  expect(normalizeSitePatternResets(before)).toBe(expected);
  expect(normalizeSitePatternResets(expected)).toBe(expected);
});

test("a single emitted family remains byte-exact", () => {
  const otherRoles = selectors.map(selector => `${selector}{--hraness-marketing-field-images:none}`).join("");
  const css = `${layer(family + otherRoles)}@media(print){.print{color:black}}`;
  expect(normalizeSitePatternResets(css)).toBe(css);
});

test("overlapping intervening declarations are never deleted", () => {
  for (const selector of ["*", "[data-hraness-pattern=mesh]", ".field", "[data-hraness-pattern=none] .child", "[data-hraness-pattern=none],.field"]) {
    expect(() => normalizeSitePatternResets(layer(family + `${selector}{--hraness-pattern-decoration:none}` + family)))
      .toThrow("intervening write");
  }
  expect(() => normalizeSitePatternResets(layer(family + ".field{@media(min-width:1px){--hraness-material-wall-images:none}}" + family)))
    .toThrow("intervening write");
  for (const property of ["--hraness-pattern-decoratio\\6e ", "--hraness-pattern-decoration/**/"]) {
    expect(() => normalizeSitePatternResets(layer(family + `.field{${property}:none}` + family)))
      .toThrow("intervening write");
  }
});

test("changed ancestry, declarations, order, count or adjacency fail closed", () => {
  const changed = [
    layer(family) + `@media(print){${layer(family)}}`,
    layer(family) + `@layer other{${family}}`,
    layer(family + family.replaceAll("initial", "none")),
    layer(family + [...selectors].reverse().map(selector => `${selector}{--hraness-material-wall-images:initial;--hraness-pattern-decoration:initial}`).join("")),
    layer(family + family + family),
    layer(family + family.replace(selectors[1]!, ".gap{color:red}" + selectors[1]!)),
    layer(family.slice(0, -1)),
    ".empty{color:red}",
  ];
  for (const css of changed) expect(() => normalizeSitePatternResets(css)).toThrow();
});

test("malformed or oversized input is rejected", () => {
  for (const css of [layer(family) + "/*", layer(family) + ".a{color:'oops}", layer(family) + "}", " ".repeat(2_097_153)]) {
    expect(() => normalizeSitePatternResets(css)).toThrow();
  }
});
