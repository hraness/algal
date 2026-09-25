import { expect, test } from "bun:test";
import { admitFirstMatrix, nativeProfile } from "./adapter";
import type { Admission } from "./readmit";
test("registered corpus requires an explicitly selected native boundary executable", () => {
  for (const invalid of [undefined, "", "relative/binary"]) expect(() => nativeProfile(invalid)).toThrow("explicit absolute");
  expect(nativeProfile("/owned/native-boundary")).toEqual({ profile: "native", native: "/owned/native-boundary" });
});
test("registered corpus cannot downgrade its first matrix or promote historical receipt applicability", () => {
  const good: Admission = { contract: "algal.corpus-readmission.v1", status: "admitted", sourceStatus: "current-source-rehashed", formalClaims: 0,
    definitionDigest: "sha256:" + "0".repeat(64), summarySha256: "sha256:" + "1".repeat(64), caseCount: 115, invocations: 230, observations: 326, capturedOutputBytes: 1, archiveBytes: 1, retainedFiles: 1 };
  expect(() => admitFirstMatrix(good)).not.toThrow();
  for (const patch of [{ caseCount: 0 }, { caseCount: 114 }, { invocations: 115 }, { observations: 230 }, { formalClaims: 1 }, { sourceStatus: "historical-externally-pinned" }, { status: "failed" }])
    expect(() => admitFirstMatrix({ ...good, ...patch } as Admission)).toThrow("first matrix");
});
