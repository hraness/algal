/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/** IndexedDB-backed durable mailbox driver. Every operation settles inside
 * one readwrite transaction with the strict durability hint, so the atomic
 * publication, pending-delivery dedupe, and consumed-marker evidence match
 * the file driver in `mailbox.ts` exactly: the same wire records, bounds,
 * capability checks, and error vocabulary. IndexedDB serializes readwrite
 * transactions across connections and tabs, which replaces the file driver's
 * create-exclusive lock; a crashed tab's in-flight write simply never
 * commits. Browser eviction, user-cleared site data, and device loss still
 * require the host to keep independent export or replay evidence. */
import {
  parseCapabilityHandle,
  suspensionDetails,
  type CapabilityHandle,
} from "./capabilities";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import {
  idbConnect,
  idbEncode,
  idbFail,
  idbFactory,
  idbName,
  idbPrefix,
  idbRequest,
  idbRow,
  idbTransact,
  type IdbOpenOptions,
} from "./idb-runtime";
import {
  MAILBOX_BOUNDS,
  MAILBOX_CONTRACT,
  MAILBOX_DELIVERY_CONTRACT,
  MAILBOX_MESSAGE_CONTRACT,
  MAILBOX_RECEIVE,
  MAILBOX_SEND,
  messageEnvelope,
  newCapability,
  normalizeOptions,
  parseConfig,
  parseDelivery,
  parseMessage,
  parseRecord,
  randomHex,
  type CapabilityRecord,
  type MailboxConfig,
  type MailboxDelivery,
  type MailboxMessage,
  type MailboxService,
} from "./mailbox-core";
import { asJsonValue, asSafeId, canonicalBytes, type JsonValue } from "./values";

export const MAILBOX_IDB_NAME = "algal.mailbox.idb.v1" as const;
const CONFIGS = "configs";
const CAPABILITIES = "capabilities";
const MESSAGES = "messages";
const PENDING = "pending";
const CONSUMED = "consumed";
const STORES: readonly string[] = [CONFIGS, CAPABILITIES, MESSAGES, PENDING, CONSUMED];
const RECORD_BYTES = {
  config: 4_096,
  capability: 4_096,
  delivery: 512,
  message: MAILBOX_BOUNDS.maxMessageBytes + 2_048,
} as const;

export class IndexedDbMailboxService implements MailboxService {
  private closed = false;
  private constructor(private readonly database: IDBDatabase) {
    database.onversionchange = () => this.close();
  }
  /** Opens (or creates) the bounded mailbox database. `factory` injects the
   * IDBFactory for non-window hosts; ambient `indexedDB` is the default. */
  static async open(options: IdbOpenOptions = {}): Promise<IndexedDbMailboxService> {
    const name = idbName(options, MAILBOX_IDB_NAME);
    const database = await idbConnect(idbFactory(options.factory), name, STORES);
    return new IndexedDbMailboxService(database);
  }
  close(): void {
    this.closed = true;
    this.database.close();
  }
  private assertOpen(): void {
    if (this.closed) idbFail("mailbox connection is closed");
  }
  private transact<T>(
    stores: readonly string[],
    mode: IDBTransactionMode,
    body: (transaction: IDBTransaction) => Promise<T>,
  ): Promise<T> {
    this.assertOpen();
    return idbTransact(this.database, stores, mode, body);
  }
  private static deliveryKey(mailbox: string, idempotencyKey: Digest): string {
    return `${mailbox}/${idempotencyKey.slice(7)}`;
  }
  private async readConfig(
    transaction: IDBTransaction,
    name: string,
  ): Promise<MailboxConfig | undefined> {
    const raw = await idbRequest(transaction.objectStore(CONFIGS).get(name)) as unknown;
    if (raw === undefined) return undefined;
    const config = parseConfig(idbRow(raw, RECORD_BYTES.config).value, `mailbox ${name}`);
    if (config.name !== name) {
      throw new AlgalError("DIGEST_MISMATCH", "mailbox config is in the wrong row");
    }
    return config;
  }
  private async resolve(
    transaction: IDBTransaction,
    handle: CapabilityHandle,
    expected: typeof MAILBOX_SEND | typeof MAILBOX_RECEIVE,
  ): Promise<{ config: MailboxConfig; record: CapabilityRecord }> {
    const parsed = parseCapabilityHandle(handle, expected);
    const raw = await idbRequest(
      transaction.objectStore(CAPABILITIES).get(parsed.digest.slice(7)),
    ) as unknown;
    if (raw === undefined) {
      throw new AlgalError("CAPABILITY_DENIED", "capability is not admitted");
    }
    const record = parseRecord(idbRow(raw, RECORD_BYTES.capability).value, "capability record");
    if (record.handle !== handle || record.revoked) {
      throw new AlgalError("CAPABILITY_DENIED", "capability is not active");
    }
    const config = await this.readConfig(transaction, record.mailbox);
    if (!config || config[expected === MAILBOX_SEND ? "send" : "receive"] !== handle) {
      throw new AlgalError("CAPABILITY_DENIED", "capability admission does not match its mailbox");
    }
    return { config, record };
  }
  async create(
    name: string,
    options?: { maxMessages?: number; maxMessageBytes?: number },
  ): Promise<MailboxConfig> {
    const checked = asSafeId(name, "mailbox name");
    const bounds = normalizeOptions(options);
    return this.transact([CONFIGS, CAPABILITIES], "readwrite", async (transaction) => {
      const existing = await this.readConfig(transaction, checked);
      if (existing) {
        if (
          existing.maxMessages !== bounds.maxMessages ||
          existing.maxMessageBytes !== bounds.maxMessageBytes
        ) {
          throw new AlgalError("PARSE_FAILED", `mailbox "${checked}" already has different bounds`);
        }
        return existing;
      }
      const count = await idbRequest(transaction.objectStore(CONFIGS).count());
      if (count >= MAILBOX_BOUNDS.maxMailboxes) {
        throw new AlgalError("BUDGET_EXHAUSTED", "mailbox count exhausted");
      }
      const nonce = randomHex(32);
      const send = newCapability(MAILBOX_SEND, checked, `${nonce}-send`);
      const receive = newCapability(MAILBOX_RECEIVE, checked, `${nonce}-receive`);
      const config: MailboxConfig = {
        contract: MAILBOX_CONTRACT,
        name: checked,
        ...bounds,
        send: send.handle,
        receive: receive.handle,
      };
      const digested = (handle: CapabilityHandle): string => parseCapabilityHandle(handle).digest.slice(7);
      transaction.objectStore(CAPABILITIES).put(idbEncode(send as unknown as JsonValue, RECORD_BYTES.capability), digested(send.handle));
      transaction.objectStore(CAPABILITIES).put(idbEncode(receive as unknown as JsonValue, RECORD_BYTES.capability), digested(receive.handle));
      transaction.objectStore(CONFIGS).put(idbEncode(config as unknown as JsonValue, RECORD_BYTES.config), checked);
      return config;
    });
  }
  async list(): Promise<MailboxConfig[]> {
    return this.transact([CONFIGS], "readonly", async (transaction) => {
      const rows = await idbRequest(
        transaction.objectStore(CONFIGS).getAll(undefined, MAILBOX_BOUNDS.maxMailboxes + 1),
      ) as unknown[];
      if (rows.length > MAILBOX_BOUNDS.maxMailboxes) {
        throw new AlgalError("BUDGET_EXHAUSTED", "mailbox count exhausted");
      }
      return rows
        .map((row) => parseConfig(idbRow(row, RECORD_BYTES.config).value, "mailbox config"))
        .sort((a, b) => a.name.localeCompare(b.name));
    });
  }
  async inspect(name: string): Promise<MailboxConfig | undefined> {
    const checked = asSafeId(name, "mailbox name");
    return this.transact([CONFIGS], "readonly", async (transaction) => this.readConfig(transaction, checked));
  }
  async revoke(handle: CapabilityHandle): Promise<void> {
    const expected = parseCapabilityHandle(handle).capability === MAILBOX_SEND ? MAILBOX_SEND : MAILBOX_RECEIVE;
    await this.transact([CONFIGS, CAPABILITIES], "readwrite", async (transaction) => {
      const { record } = await this.resolve(transaction, handle, expected);
      transaction.objectStore(CAPABILITIES).put(
        idbEncode({ ...record, revoked: true } as unknown as JsonValue, RECORD_BYTES.capability),
        parseCapabilityHandle(handle).digest.slice(7),
      );
    });
  }
  private async pendingKeys(
    transaction: IDBTransaction,
    mailbox: string,
    max: number,
  ): Promise<string[]> {
    const keys = await idbRequest(
      transaction.objectStore(PENDING).getAllKeys(idbPrefix(`${mailbox}/`), max + 1),
    ) as IDBValidKey[];
    if (keys.length > max) {
      throw new AlgalError(
        "BUDGET_EXHAUSTED",
        `mailbox "${mailbox}" exceeds ${max} pending entries`,
      );
    }
    if (keys.some((key) => typeof key !== "string")) idbFail("unexpected pending entry key");
    return keys as string[];
  }
  private async marker(
    transaction: IDBTransaction,
    store: string,
    key: string,
    idempotencyKey: Digest,
  ): Promise<MailboxDelivery | undefined> {
    const raw = await idbRequest(transaction.objectStore(store).get(key)) as unknown;
    if (raw === undefined) return undefined;
    return parseDelivery(idbRow(raw, RECORD_BYTES.delivery).value, `mailbox delivery ${idempotencyKey}`);
  }
  async send(
    handle: CapabilityHandle,
    value: JsonValue,
    idempotencyKey: Digest,
  ): Promise<{ id: Digest }> {
    idempotencyKey = asDigest(idempotencyKey, "mailbox idempotency key");
    value = asJsonValue(value, "mailbox message");
    return this.transact(STORES, "readwrite", async (transaction) => {
      const { config } = await this.resolve(transaction, handle, MAILBOX_SEND);
      const bytes = canonicalBytes(value);
      if (bytes > config.maxMessageBytes) {
        throw new AlgalError(
          "BUDGET_EXHAUSTED",
          `mailbox message ${bytes}B exceeds ${config.maxMessageBytes}B`,
        );
      }
      const id = digestCanonical(messageEnvelope(config.name, idempotencyKey, value));
      const key = IndexedDbMailboxService.deliveryKey(config.name, idempotencyKey);
      const validateMessage = (raw: unknown): void => {
        const message = parseMessage(idbRow(raw, RECORD_BYTES.message).value, `mailbox message ${idempotencyKey}`);
        if (
          message.id !== id ||
          message.idempotencyKey !== idempotencyKey ||
          message.mailbox !== config.name
        ) {
          throw new AlgalError(
            "DIGEST_MISMATCH",
            "idempotency key already claims a different mailbox message",
          );
        }
      };
      const existingMessage = await idbRequest(transaction.objectStore(MESSAGES).get(key)) as unknown;
      if (existingMessage !== undefined) {
        validateMessage(existingMessage);
      } else {
        for (const store of [PENDING, CONSUMED]) {
          if (await this.marker(transaction, store, key, idempotencyKey) !== undefined) {
            throw new AlgalError("DIGEST_MISMATCH", "mailbox delivery has no message claim");
          }
        }
        if ((await this.pendingKeys(transaction, config.name, config.maxMessages)).length >= config.maxMessages) {
          throw new AlgalError("MAILBOX_FULL", `mailbox "${config.name}" is full`);
        }
        const message: MailboxMessage = {
          contract: MAILBOX_MESSAGE_CONTRACT,
          id,
          mailbox: config.name,
          idempotencyKey,
          value,
        };
        transaction.objectStore(MESSAGES).put(idbEncode(message as unknown as JsonValue, RECORD_BYTES.message), key);
      }
      for (const store of [PENDING, CONSUMED]) {
        const marker = await this.marker(transaction, store, key, idempotencyKey);
        if (marker === undefined) continue;
        if (marker.id !== id) {
          throw new AlgalError("DIGEST_MISMATCH", "mailbox delivery claims another message");
        }
        return { id };
      }
      if ((await this.pendingKeys(transaction, config.name, config.maxMessages)).length >= config.maxMessages) {
        throw new AlgalError("MAILBOX_FULL", `mailbox "${config.name}" is full`);
      }
      const delivery: MailboxDelivery = {
        contract: MAILBOX_DELIVERY_CONTRACT,
        id,
      };
      transaction.objectStore(PENDING).put(idbEncode(delivery as unknown as JsonValue, RECORD_BYTES.delivery), key);
      return { id };
    });
  }
  async hasPending(handle: CapabilityHandle): Promise<boolean> {
    return this.transact([CONFIGS, CAPABILITIES, PENDING], "readonly", async (transaction) => {
      const { config } = await this.resolve(transaction, handle, MAILBOX_RECEIVE);
      return (await this.pendingKeys(transaction, config.name, config.maxMessages)).length > 0;
    });
  }
  async receive(
    handle: CapabilityHandle,
  ): Promise<{ id: Digest; message: JsonValue }> {
    return this.transact(STORES, "readwrite", async (transaction) => {
      const { config } = await this.resolve(transaction, handle, MAILBOX_RECEIVE);
      const pending = await this.pendingKeys(transaction, config.name, config.maxMessages);
      if (pending.length === 0) {
        throw new AlgalError(
          "EFFECT_SUSPENDED",
          `mailbox "${config.name}" is empty`,
          suspensionDetails(handle),
        );
      }
      const key = pending[0]!;
      const delivery = parseDelivery(
        idbRow(await idbRequest(transaction.objectStore(PENDING).get(key)), RECORD_BYTES.delivery).value,
        `mailbox delivery ${key}`,
      );
      const message = parseMessage(
        idbRow(await idbRequest(transaction.objectStore(MESSAGES).get(key)), RECORD_BYTES.message).value,
        `mailbox message ${key}`,
      );
      if (
        delivery.id !== message.id ||
        `${message.idempotencyKey.slice(7)}` !== key.slice(config.name.length + 1) ||
        message.mailbox !== config.name
      ) {
        throw new AlgalError("DIGEST_MISMATCH", `mailbox delivery ${key} is corrupt`);
      }
      const bytes = canonicalBytes(message.value);
      if (bytes > config.maxMessageBytes) {
        throw new AlgalError(
          "BUDGET_EXHAUSTED",
          `mailbox message ${bytes}B exceeds ${config.maxMessageBytes}B`,
        );
      }
      transaction.objectStore(CONSUMED).put(
        idbEncode(delivery as unknown as JsonValue, RECORD_BYTES.delivery),
        key,
      );
      transaction.objectStore(PENDING).delete(key);
      return { id: message.id, message: message.value };
    });
  }
}
