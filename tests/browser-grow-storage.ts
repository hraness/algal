/// <reference lib="dom.iterable" />
/** Browser conformance, invoked by scripts/browser-grow-qualification.mjs.
 * Uses the actual IndexedDB and Web Locks APIs, not an in-memory IDB mock. */
import { IndexedDbApplicationStorage } from "../src/application-browser-storage";
import { BrowserGrowController } from "../examples/browser-grow/controller";
import { APPLICATION } from "../examples/malleable-site/core";
import { digestCanonical } from "../src/digest";
import { loadSurfaceEvaluator } from "../site/living";
import { asJsonValue, type JsonValue } from "../src/values";

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
async function rejects(action: () => Promise<unknown>, label: string): Promise<void> {
  let rejected = false; try { await action(); } catch { rejected = true; }
  assert(rejected, `Expected rejection: ${label}`);
}
export { BrowserGrowController, IndexedDbApplicationStorage, loadSurfaceEvaluator };

export async function storageChecks(): Promise<string[]> {
  await loadSurfaceEvaluator();
  const checks: string[] = [], opened: IndexedDbApplicationStorage[] = [];
  async function fresh(): Promise<IndexedDbApplicationStorage> {
    const storage = await IndexedDbApplicationStorage.open({ name: `algal-grow-qa-${crypto.randomUUID()}` }); opened.push(storage); return storage;
  }
  try {
    const storage = await fresh(), controller = new BrowserGrowController(storage);
    const first = await controller.initialize(), proposal = await controller.propose(first.head, { source: "rules" });
    assert(proposal.accepted, "Rule proposal should improve the initial objective");
    const adopted = await controller.adopt(first.head, proposal.reference);
    await rejects(() => controller.signal(first.head, { kind: "audience", value: "operators" }), "stale signal");
    await rejects(() => controller.adopt(first.head, proposal.reference), "stale adoption");
    const signaled = await controller.signal(adopted.head, { kind: "audience", value: "operators" });
    const restored = await controller.restore(signaled.head, first.head);
    assert(restored.signals.audience === "operators" && restored.definition.config.headline === first.definition.config.headline, "Restore must preserve current signals");
    checks.push("durable lifecycle, strict adoption, stale commands, and forward restore");
    const bundle = await controller.exportBundle(), verified = await BrowserGrowController.verifyBundle(bundle);
    assert(verified.head === restored.head, "Export replay should preserve head");
    const destination = await fresh(), imported = await BrowserGrowController.importBundle(destination, bundle);
    assert((await imported.capture()).head === restored.head, "Fresh import must preserve content head");
    await rejects(() => BrowserGrowController.importBundle(destination, bundle), "import into existing workspace");
    checks.push("verified export and fresh-identity import without overwrite");

    const interrupted = await fresh(), originalHead = interrupted.writeHead.bind(interrupted);
    let failHead = true;
    interrupted.writeHead = async (app, value) => { if (failHead) { failHead = false; throw new Error("Injected before durable head"); } await originalHead(app, value); };
    await rejects(() => new BrowserGrowController(interrupted).initialize(), "interrupted genesis publication");
    assert(await interrupted.readHead(APPLICATION) === undefined && await interrupted.operationCount(APPLICATION) === 1, "Prepared genesis should be retained without head");
    const recovered = await new BrowserGrowController(interrupted).initialize();
    assert(recovered.history.length === 1, "Exact prepared genesis should recover once");
    checks.push("prepared genesis interruption recovers exact retained bytes");

    const quota = await fresh();
    let invoked = false;
    await rejects(() => quota.publication("quota-app", Array<JsonValue>(64).fill("x".repeat(70_000)), async () => { invoked = true; }), "logical reservation quota");
    assert(!invoked, "Over-quota publication must fail before callback");
    const before = await quota.exportRaw();
    await rejects(() => quota.publication("quota-app", [{ test: true }], async () => { throw new Error("Injected after reservation"); }), "failed charged publication");
    assert(JSON.stringify(await quota.exportRaw()) !== JSON.stringify(before), "Failed publication retains charge");
    checks.push("quota failure is pre-publication and failed work retains its reservation");

    const immutable = await fresh(), identity = digestCanonical({ operation: 1 });
    await immutable.publication("identity-app", [{ retained: 1 }], () => immutable.writeOperation("identity-app", identity, { retained: 1 }));
    await immutable.writeOperation("identity-app", identity, { retained: 1 });
    await rejects(() => immutable.writeOperation("identity-app", identity, { retained: 2 }), "conflicting operation identity");
    assert(JSON.stringify(await immutable.readOperation("identity-app", identity)) === '{"retained":1}', "Original immutable operation must remain");
    checks.push("immutable operation retries compare exact retained values");

    const corruptionName = `algal-grow-qa-${crypto.randomUUID()}`;
    const corruptible = await IndexedDbApplicationStorage.open({ name: corruptionName }); opened.push(corruptible);
    const corruptController = new BrowserGrowController(corruptible), healthy = await corruptController.initialize();
    const value = await corruptible.store.putValue({ diagnostic: "retain me" });
    corruptible.close();
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open(corruptionName); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("rows", "readwrite"), request = transaction.objectStore("rows").get(`value/${value}`);
      request.onsuccess = () => {
        const row = request.result as { contract: string; json: string; digest: string };
        transaction.objectStore("rows").put({ ...row, json: "{broken retained bytes" }, `value/${value}`);
      };
      transaction.oncomplete = () => resolve(); transaction.onabort = () => reject(transaction.error);
    }); db.close();
    await rejects(() => IndexedDbApplicationStorage.open({ name: corruptionName }), "corrupt CAS audit");
    const raw = await IndexedDbApplicationStorage.exportRaw({ name: corruptionName });
    assert(JSON.stringify(raw).includes("broken retained bytes") && JSON.stringify(raw).includes(healthy.head), "Raw recovery export must retain corrupt bytes and original head");
    checks.push("corruption fails closed and raw recovery preserves original evidence");

    const missing = structuredClone(bundle);
    missing.evidence.records = missing.evidence.records.filter(record => record.reference !== bundle.evidence.states[0]);
    await rejects(() => BrowserGrowController.verifyBundle(asJsonValue(missing, "test bundle")), "missing retained dependency");
    checks.push("bundle replay rejects missing dependencies instead of healing them");
    return checks;
  } finally { for (const storage of opened) storage.close(); }
}
