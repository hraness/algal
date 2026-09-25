/** Fixture-control failures must survive a product API that catches callback errors. */
export class IntendedUnknown extends Error {
  constructor() { super("History effect acknowledgment lost"); }
}
export class FixtureCustody {
  private total = 0;
  private failed = false;
  private failure: unknown;
  assertHealthy(): void { if (this.failed) throw this.failure; }
  async callback<T>(run: () => Promise<T>): Promise<T> {
    this.assertHealthy();
    try {
      if (this.total >= 32) throw new Error("History total callback count bound");
      this.total++;
      return await run();
    } catch (error) {
      if (!(error instanceof IntendedUnknown)) { this.failed = true; this.failure = error; }
      throw error;
    }
  }
}
