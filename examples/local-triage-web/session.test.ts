import { expect, test } from "bun:test";
import fixtures from "../local-triage/session-compatibility-fixtures.json";
import { sessionCompatibility } from "./session";
for (const fixture of fixtures) test(`browser/native session fixture: ${fixture.name}`, () => {
  expect(sessionCompatibility(fixture.before, fixture.after, fixture.focusedField, fixture.headChanged)).toEqual(fixture.expected);
});
