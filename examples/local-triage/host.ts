/** Filesystem compatibility wrapper around the portable task lifecycle. */
import { join } from "node:path";
import { FileApplicationStorage } from "../../src/application-filesystem";
import { hostLease, hostRead, hostWrite } from "../../src/host-state";
import type { Digest } from "../../src/digest-type";
import type { JsonValue } from "../../src/values";
import { id } from "./contract";
import { TriageCore, TRIAGE_SESSION_BYTES, hash, type TriageSessionStorage } from "./core";
export * from "./core";

/** Preserve the existing session.json layout and compare-and-set lease. */
export class FileTriageSessionStorage implements TriageSessionStorage {
  constructor(readonly directory: string) {}
  private directoryFor(application: string, sessionId: string): string {
    return join(this.directory, "triage-sessions", id(application), id(sessionId));
  }
  read(application: string, sessionId: string): Promise<JsonValue | undefined> {
    return hostRead(join(this.directoryFor(application, sessionId), "session.json"), TRIAGE_SESSION_BYTES);
  }
  async compareAndSet(application: string, sessionId: string, expected: Digest | null, value: JsonValue): Promise<void> {
    const directory = this.directoryFor(application, sessionId);
    await hostLease(directory, `triage-session-${id(sessionId)}`, async () => {
      const retained = await this.read(application, sessionId);
      if ((retained === undefined ? null : hash(retained)) !== expected) throw new Error("Newer session draft exists; explicit merge required");
      await hostWrite(join(directory, "session.json"), value, TRIAGE_SESSION_BYTES, false);
    });
  }
}

export class TriageHost extends TriageCore {
  constructor(readonly directory: string, application = "local-triage") {
    super(new FileApplicationStorage(directory), application, new FileTriageSessionStorage(directory));
  }
}
