import { randomBytes } from "node:crypto";
import {
  link,
  lstat,
  mkdir,
  open,
  opendir,
  readFile,
  rename,
  unlink,
} from "node:fs/promises";
import { join } from "node:path";
import {
  capabilityHandle,
  parseCapabilityHandle,
  suspensionDetails,
  type CapabilityHandle,
} from "./capabilities";
import { BOUNDS } from "./contract";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import type { ToolRegistry } from "./tools";
import {
  asInt,
  asJsonValue,
  asObject,
  asSafeId,
  asString,
  canonicalBytes,
  canonicalize,
  noUnknownKeys,
  reqField,
  type JsonValue,
} from "./values";

export const CAPABILITY_CONTRACT = "algal.capability.v1" as const;
export const MAILBOX_CONTRACT = "algal.mailbox.v1" as const;
export const MAILBOX_MESSAGE_CONTRACT = "algal.mailbox-message.v1" as const;
export const MAILBOX_DELIVERY_CONTRACT = "algal.mailbox-delivery.v1" as const;
export const MAILBOX_SEND = "mailbox-send" as const;
export const MAILBOX_RECEIVE = "mailbox-receive" as const;
export const MAILBOX_SEND_TOOL = "mailbox.send.v1" as const;
export const MAILBOX_RECEIVE_TOOL = "mailbox.receive.v1" as const;
export const MAILBOX_BOUNDS = {
  maxMailboxes: 1024,
  maxMessages: 1024,
  maxMessageBytes: 250_000,
} as const;

export type MailboxConfig = {
  contract: typeof MAILBOX_CONTRACT;
  name: string;
  maxMessages: number;
  maxMessageBytes: number;
  send: CapabilityHandle;
  receive: CapabilityHandle;
};

type CapabilityRecord = {
  contract: typeof CAPABILITY_CONTRACT;
  handle: CapabilityHandle;
  capability: typeof MAILBOX_SEND | typeof MAILBOX_RECEIVE;
  mailbox: string;
  nonce: string;
  revoked: boolean;
};

type MailboxMessage = {
  contract: typeof MAILBOX_MESSAGE_CONTRACT;
  id: Digest;
  mailbox: string;
  idempotencyKey: Digest;
  value: JsonValue;
};

type MailboxDelivery = {
  contract: typeof MAILBOX_DELIVERY_CONTRACT;
  id: Digest;
};

export interface MailboxService {
  create(
    name: string,
    options?: { maxMessages?: number; maxMessageBytes?: number },
  ): Promise<MailboxConfig>;
  list(): Promise<MailboxConfig[]>;
  inspect(name: string): Promise<MailboxConfig | undefined>;
  revoke(handle: CapabilityHandle): Promise<void>;
  send(
    handle: CapabilityHandle,
    value: JsonValue,
    idempotencyKey: Digest,
  ): Promise<{ id: Digest }>;
  receive(
    handle: CapabilityHandle,
  ): Promise<{ id: Digest; message: JsonValue }>;
  hasPending(handle: CapabilityHandle): Promise<boolean>;
}

function descriptor(record: Pick<CapabilityRecord, "capability" | "mailbox" | "nonce">): JsonValue {
  return {
    capability: record.capability,
    contract: CAPABILITY_CONTRACT,
    mailbox: record.mailbox,
    nonce: record.nonce,
  };
}

function newCapability(
  capability: typeof MAILBOX_SEND | typeof MAILBOX_RECEIVE,
  mailbox: string,
  nonce: string,
): CapabilityRecord {
  const base = { capability, mailbox, nonce };
  return {
    contract: CAPABILITY_CONTRACT,
    handle: capabilityHandle(capability, descriptor(base)),
    capability,
    mailbox,
    nonce,
    revoked: false,
  };
}

function parseConfig(value: unknown, what: string): MailboxConfig {
  const obj = asObject(value, what);
  noUnknownKeys(
    obj,
    ["contract", "name", "maxMessages", "maxMessageBytes", "send", "receive"],
    what,
  );
  if (obj.contract !== MAILBOX_CONTRACT) {
    throw new AlgalError("PARSE_FAILED", `${what}.contract must be ${MAILBOX_CONTRACT}`);
  }
  const config: MailboxConfig = {
    contract: MAILBOX_CONTRACT,
    name: asSafeId(reqField(obj, "name", what), `${what}.name`),
    maxMessages: asInt(
      reqField(obj, "maxMessages", what),
      `${what}.maxMessages`,
      1,
      MAILBOX_BOUNDS.maxMessages,
    ),
    maxMessageBytes: asInt(
      reqField(obj, "maxMessageBytes", what),
      `${what}.maxMessageBytes`,
      1,
      MAILBOX_BOUNDS.maxMessageBytes,
    ),
    send: parseCapabilityHandle(
      reqField(obj, "send", what),
      MAILBOX_SEND,
      `${what}.send`,
    ).handle,
    receive: parseCapabilityHandle(
      reqField(obj, "receive", what),
      MAILBOX_RECEIVE,
      `${what}.receive`,
    ).handle,
  };
  return config;
}

function parseRecord(value: unknown, what: string): CapabilityRecord {
  const obj = asObject(value, what);
  noUnknownKeys(
    obj,
    ["contract", "handle", "capability", "mailbox", "nonce", "revoked"],
    what,
  );
  if (obj.contract !== CAPABILITY_CONTRACT) {
    throw new AlgalError("PARSE_FAILED", `${what}.contract must be ${CAPABILITY_CONTRACT}`);
  }
  const capability = asSafeId(
    reqField(obj, "capability", what),
    `${what}.capability`,
  );
  if (capability !== MAILBOX_SEND && capability !== MAILBOX_RECEIVE) {
    throw new AlgalError("PARSE_FAILED", `${what}.capability is not a mailbox right`);
  }
  const record: CapabilityRecord = {
    contract: CAPABILITY_CONTRACT,
    handle: parseCapabilityHandle(
      reqField(obj, "handle", what),
      capability,
      `${what}.handle`,
    ).handle,
    capability,
    mailbox: asSafeId(reqField(obj, "mailbox", what), `${what}.mailbox`),
    nonce: asString(reqField(obj, "nonce", what), `${what}.nonce`, 128),
    revoked: reqField(obj, "revoked", what) === true,
  };
  if (obj.revoked !== true && obj.revoked !== false) {
    throw new AlgalError("PARSE_FAILED", `${what}.revoked must be a boolean`);
  }
  if (capabilityHandle(capability, descriptor(record)) !== record.handle) {
    throw new AlgalError("DIGEST_MISMATCH", `${what}.handle does not match its admission`);
  }
  return record;
}

function messageEnvelope(
  mailbox: string,
  idempotencyKey: Digest,
  value: JsonValue,
): JsonValue {
  return {
    contract: MAILBOX_MESSAGE_CONTRACT,
    idempotencyKey,
    mailbox,
    value,
  };
}

function parseMessage(value: unknown, what: string): MailboxMessage {
  const obj = asObject(value, what);
  noUnknownKeys(
    obj,
    ["contract", "id", "mailbox", "idempotencyKey", "value"],
    what,
  );
  if (obj.contract !== MAILBOX_MESSAGE_CONTRACT) {
    throw new AlgalError("PARSE_FAILED", `${what}.contract must be ${MAILBOX_MESSAGE_CONTRACT}`);
  }
  const mailbox = asSafeId(reqField(obj, "mailbox", what), `${what}.mailbox`);
  const idempotencyKey = asString(
    reqField(obj, "idempotencyKey", what),
    `${what}.idempotencyKey`,
    71,
  ) as Digest;
  if (!/^sha256:[0-9a-f]{64}$/.test(idempotencyKey)) {
    throw new AlgalError("PARSE_FAILED", `${what}.idempotencyKey must be a digest`);
  }
  const body = asJsonValue(reqField(obj, "value", what), `${what}.value`);
  const id = asString(reqField(obj, "id", what), `${what}.id`, 71) as Digest;
  if (id !== digestCanonical(messageEnvelope(mailbox, idempotencyKey, body))) {
    throw new AlgalError("DIGEST_MISMATCH", `${what}.id does not match its message`);
  }
  return {
    contract: MAILBOX_MESSAGE_CONTRACT,
    id,
    mailbox,
    idempotencyKey,
    value: body,
  };
}

function parseDelivery(value: unknown, what: string): MailboxDelivery {
  const obj = asObject(value, what);
  noUnknownKeys(obj, ["contract", "id"], what);
  if (obj.contract !== MAILBOX_DELIVERY_CONTRACT) {
    throw new AlgalError("PARSE_FAILED", `${what}.contract must be ${MAILBOX_DELIVERY_CONTRACT}`);
  }
  const id = asString(reqField(obj, "id", what), `${what}.id`, 71) as Digest;
  if (!/^sha256:[0-9a-f]{64}$/.test(id)) {
    throw new AlgalError("PARSE_FAILED", `${what}.id must be a digest`);
  }
  return { contract: MAILBOX_DELIVERY_CONTRACT, id };
}

function normalizeOptions(
  options: { maxMessages?: number; maxMessageBytes?: number } = {},
): { maxMessages: number; maxMessageBytes: number } {
  return {
    maxMessages: asInt(
      options.maxMessages ?? 64,
      "mailbox maxMessages",
      1,
      MAILBOX_BOUNDS.maxMessages,
    ),
    maxMessageBytes: asInt(
      options.maxMessageBytes ?? 65_536,
      "mailbox maxMessageBytes",
      1,
      MAILBOX_BOUNDS.maxMessageBytes,
    ),
  };
}

export class MemoryMailboxService implements MailboxService {
  private configs = new Map<string, MailboxConfig>();
  private records = new Map<CapabilityHandle, CapabilityRecord>();
  private pending = new Map<string, Map<Digest, MailboxMessage>>();
  private history = new Map<string, Map<Digest, MailboxMessage>>();

  async create(
    name: string,
    options?: { maxMessages?: number; maxMessageBytes?: number },
  ): Promise<MailboxConfig> {
    const checked = asSafeId(name, "mailbox name");
    const bounds = normalizeOptions(options);
    const existing = this.configs.get(checked);
    if (existing) {
      if (
        existing.maxMessages !== bounds.maxMessages ||
        existing.maxMessageBytes !== bounds.maxMessageBytes
      ) {
        throw new AlgalError("PARSE_FAILED", `mailbox "${checked}" already has different bounds`);
      }
      return structuredClone(existing);
    }
    if (this.configs.size >= MAILBOX_BOUNDS.maxMailboxes) {
      throw new AlgalError("BUDGET_EXHAUSTED", "mailbox count exhausted");
    }
    const nonce = randomBytes(32).toString("hex");
    const send = newCapability(MAILBOX_SEND, checked, `${nonce}-send`);
    const receive = newCapability(MAILBOX_RECEIVE, checked, `${nonce}-receive`);
    const config: MailboxConfig = {
      contract: MAILBOX_CONTRACT,
      name: checked,
      ...bounds,
      send: send.handle,
      receive: receive.handle,
    };
    this.configs.set(checked, config);
    this.records.set(send.handle, send);
    this.records.set(receive.handle, receive);
    this.pending.set(checked, new Map());
    this.history.set(checked, new Map());
    return structuredClone(config);
  }

  async list(): Promise<MailboxConfig[]> {
    return [...this.configs.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((config) => structuredClone(config));
  }

  async inspect(name: string): Promise<MailboxConfig | undefined> {
    return structuredClone(this.configs.get(asSafeId(name, "mailbox name")));
  }

  async revoke(handle: CapabilityHandle): Promise<void> {
    const record = this.records.get(parseCapabilityHandle(handle).handle);
    if (!record) {
      throw new AlgalError("CAPABILITY_DENIED", "capability is not admitted");
    }
    record.revoked = true;
  }

  private resolve(
    handle: CapabilityHandle,
    expected: typeof MAILBOX_SEND | typeof MAILBOX_RECEIVE,
  ): { config: MailboxConfig; record: CapabilityRecord } {
    const parsed = parseCapabilityHandle(handle, expected);
    const record = this.records.get(parsed.handle);
    if (!record || record.revoked) {
      throw new AlgalError("CAPABILITY_DENIED", "capability is not active");
    }
    const config = this.configs.get(record.mailbox);
    if (!config || config[expected === MAILBOX_SEND ? "send" : "receive"] !== handle) {
      throw new AlgalError("CAPABILITY_DENIED", "capability admission does not match its mailbox");
    }
    return { config, record };
  }

  async send(
    handle: CapabilityHandle,
    value: JsonValue,
    idempotencyKey: Digest,
  ): Promise<{ id: Digest }> {
    idempotencyKey = asDigest(idempotencyKey, "mailbox idempotency key");
    value = asJsonValue(value, "mailbox message");
    const { config } = this.resolve(handle, MAILBOX_SEND);
    const bytes = canonicalBytes(value);
    if (bytes > config.maxMessageBytes) {
      throw new AlgalError(
        "BUDGET_EXHAUSTED",
        `mailbox message ${bytes}B exceeds ${config.maxMessageBytes}B`,
      );
    }
    const queue = this.pending.get(config.name)!;
    const history = this.history.get(config.name)!;
    const id = digestCanonical(messageEnvelope(config.name, idempotencyKey, value));
    const existing = history.get(idempotencyKey);
    if (existing) {
      if (existing.id !== id) {
        throw new AlgalError(
          "DIGEST_MISMATCH",
          "idempotency key already claims a different mailbox message",
        );
      }
      return { id };
    }
    if (queue.size >= config.maxMessages) {
      throw new AlgalError("MAILBOX_FULL", `mailbox "${config.name}" is full`);
    }
    const message: MailboxMessage = {
      contract: MAILBOX_MESSAGE_CONTRACT,
      id,
      mailbox: config.name,
      idempotencyKey,
      value: structuredClone(value),
    };
    history.set(idempotencyKey, message);
    queue.set(idempotencyKey, message);
    return { id };
  }

  async hasPending(handle: CapabilityHandle): Promise<boolean> {
    const { config } = this.resolve(handle, MAILBOX_RECEIVE);
    return this.pending.get(config.name)!.size > 0;
  }

  async receive(
    handle: CapabilityHandle,
  ): Promise<{ id: Digest; message: JsonValue }> {
    const { config } = this.resolve(handle, MAILBOX_RECEIVE);
    const queue = this.pending.get(config.name)!;
    const delivery = [...queue.keys()].sort()[0];
    if (!delivery) {
      throw new AlgalError(
        "EFFECT_SUSPENDED",
        `mailbox "${config.name}" is empty`,
        suspensionDetails(handle),
      );
    }
    const message = queue.get(delivery)!;
    queue.delete(delivery);
    return { id: message.id, message: structuredClone(message.value) };
  }
}

async function noLink(path: string): Promise<void> {
  try {
    if ((await lstat(path)).isSymbolicLink()) {
      throw new AlgalError("IO_FAILED", "mailbox symlinks are not admitted");
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

async function readJson(path: string): Promise<unknown | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    if (error instanceof SyntaxError) {
      throw new AlgalError("PARSE_FAILED", `${path}: ${error.message}`);
    }
    throw error;
  }
}

async function writeNew(path: string, value: JsonValue): Promise<boolean> {
  // Publish complete immutable bytes without exposing a partially written file.
  const temporary = `${path}.algal-${process.pid}-${randomBytes(8).toString("hex")}`;
  const file = await open(temporary, "wx", 0o600);
  try {
    await file.writeFile(canonicalize(value));
    await file.sync();
  } catch (error) {
    await file.close();
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
  await file.close();
  try {
    await link(temporary, path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw error;
  } finally {
    await unlink(temporary);
  }
}

async function writeReplace(path: string, value: JsonValue): Promise<void> {
  const temporary = `${path}.algal-${process.pid}-${randomBytes(8).toString("hex")}`;
  if (!await writeNew(temporary, value)) {
    throw new AlgalError("IO_FAILED", "mailbox temporary file collision");
  }
  try {
    await rename(temporary, path);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}

async function jsonFiles(path: string, max: number): Promise<string[]> {
  const files: string[] = [];
  try {
    const directory = await opendir(path);
    for await (const entry of directory) {
      if (entry.isSymbolicLink()) {
        throw new AlgalError("IO_FAILED", "mailbox symlinks are not admitted");
      }
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      files.push(entry.name);
      if (files.length > max) {
        throw new AlgalError("BUDGET_EXHAUSTED", `${path} exceeds ${max} entries`);
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  files.sort();
  return files;
}

export class FileMailboxService implements MailboxService {
  constructor(readonly dir: string) {}

  private async guard(name?: string): Promise<void> {
    await noLink(this.dir);
    await noLink(join(this.dir, "mailboxes"));
    await noLink(join(this.dir, "capabilities"));
    if (name !== undefined) {
      const checked = asSafeId(name, "mailbox name");
      const mailbox = join(this.dir, "mailboxes", checked);
      await noLink(mailbox);
      await noLink(join(mailbox, "config.json"));
      await noLink(join(mailbox, "messages"));
      await noLink(join(mailbox, "pending"));
      await noLink(join(mailbox, "consumed"));
    }
  }

  private configPath(name: string): string {
    return join(this.dir, "mailboxes", asSafeId(name, "mailbox name"), "config.json");
  }

  private recordPath(handle: CapabilityHandle): string {
    const parsed = parseCapabilityHandle(handle);
    return join(this.dir, "capabilities", `${parsed.digest.slice(7)}.json`);
  }

  private messagesDir(name: string): string {
    return join(this.dir, "mailboxes", asSafeId(name, "mailbox name"), "messages");
  }

  private pendingDir(name: string): string {
    return join(this.dir, "mailboxes", asSafeId(name, "mailbox name"), "pending");
  }

  private consumedDir(name: string): string {
    return join(this.dir, "mailboxes", asSafeId(name, "mailbox name"), "consumed");
  }

  async create(
    name: string,
    options?: { maxMessages?: number; maxMessageBytes?: number },
  ): Promise<MailboxConfig> {
    const checked = asSafeId(name, "mailbox name");
    await this.guard(checked);
    const bounds = normalizeOptions(options);
    const existing = await this.inspect(checked);
    if (existing) {
      if (
        existing.maxMessages !== bounds.maxMessages ||
        existing.maxMessageBytes !== bounds.maxMessageBytes
      ) {
        throw new AlgalError("PARSE_FAILED", `mailbox "${checked}" already has different bounds`);
      }
      return existing;
    }
    if ((await this.list()).length >= MAILBOX_BOUNDS.maxMailboxes) {
      throw new AlgalError("BUDGET_EXHAUSTED", "mailbox count exhausted");
    }
    const nonce = randomBytes(32).toString("hex");
    const send = newCapability(MAILBOX_SEND, checked, `${nonce}-send`);
    const receive = newCapability(MAILBOX_RECEIVE, checked, `${nonce}-receive`);
    const config: MailboxConfig = {
      contract: MAILBOX_CONTRACT,
      name: checked,
      ...bounds,
      send: send.handle,
      receive: receive.handle,
    };
    const mailboxDir = join(this.dir, "mailboxes", checked);
    await mkdir(join(mailboxDir, "messages"), { recursive: true });
    await mkdir(join(mailboxDir, "pending"), { recursive: true });
    await mkdir(join(mailboxDir, "consumed"), { recursive: true });
    await mkdir(join(this.dir, "capabilities"), { recursive: true });
    await this.guard(checked);
    await writeNew(this.recordPath(send.handle), send as unknown as JsonValue);
    await writeNew(this.recordPath(receive.handle), receive as unknown as JsonValue);
    if (!await writeNew(this.configPath(checked), config as unknown as JsonValue)) {
      const raced = await this.inspect(checked);
      if (!raced) throw new AlgalError("IO_FAILED", "mailbox creation raced without a config");
      return raced;
    }
    return config;
  }

  async list(): Promise<MailboxConfig[]> {
    await this.guard();
    const root = join(this.dir, "mailboxes");
    const configs: MailboxConfig[] = [];
    try {
      const directory = await opendir(root);
      for await (const entry of directory) {
        if (entry.isSymbolicLink()) {
          throw new AlgalError("IO_FAILED", "mailbox symlinks are not admitted");
        }
        if (!entry.isDirectory()) continue;
        await this.guard(entry.name);
        const raw = await readJson(join(root, entry.name, "config.json"));
        if (raw === undefined) continue;
        const config = parseConfig(raw, `mailbox ${entry.name}`);
        if (config.name !== entry.name) {
          throw new AlgalError("DIGEST_MISMATCH", "mailbox config is in the wrong directory");
        }
        configs.push(config);
        if (configs.length > MAILBOX_BOUNDS.maxMailboxes) {
          throw new AlgalError("BUDGET_EXHAUSTED", "mailbox count exhausted");
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    configs.sort((a, b) => a.name.localeCompare(b.name));
    return configs;
  }

  async inspect(name: string): Promise<MailboxConfig | undefined> {
    const checked = asSafeId(name, "mailbox name");
    await this.guard(checked);
    const value = await readJson(this.configPath(checked));
    if (value === undefined) return undefined;
    const config = parseConfig(value, `mailbox ${checked}`);
    if (config.name !== checked) {
      throw new AlgalError("DIGEST_MISMATCH", "mailbox config is in the wrong directory");
    }
    return config;
  }

  private async resolve(
    handle: CapabilityHandle,
    expected: typeof MAILBOX_SEND | typeof MAILBOX_RECEIVE,
  ): Promise<{ config: MailboxConfig; record: CapabilityRecord }> {
    const parsed = parseCapabilityHandle(handle, expected);
    const recordPath = this.recordPath(parsed.handle);
    await noLink(recordPath);
    const value = await readJson(recordPath);
    if (value === undefined) {
      throw new AlgalError("CAPABILITY_DENIED", "capability is not admitted");
    }
    const record = parseRecord(value, "capability record");
    if (record.handle !== handle || record.revoked) {
      throw new AlgalError("CAPABILITY_DENIED", "capability is not active");
    }
    const config = await this.inspect(record.mailbox);
    if (!config || config[expected === MAILBOX_SEND ? "send" : "receive"] !== handle) {
      throw new AlgalError("CAPABILITY_DENIED", "capability admission does not match its mailbox");
    }
    return { config, record };
  }

  private async withMailboxLock<T>(name: string, operation: () => Promise<T>): Promise<T> {
    await this.guard(name);
    const path = join(this.dir, "mailboxes", asSafeId(name, "mailbox name"), ".lock");
    let lock;
    try {
      lock = await open(path, "wx", 0o600);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        throw new AlgalError("IO_FAILED", `mailbox "${name}" is locked; reconcile the owning operation before retrying`);
      }
      throw error;
    }
    try {
      return await operation();
    } finally {
      await lock.close();
      await unlink(path);
    }
  }

  async hasPending(handle: CapabilityHandle): Promise<boolean> {
    const { config } = await this.resolve(handle, MAILBOX_RECEIVE);
    return this.withMailboxLock(config.name, async () => {
      await this.resolve(handle, MAILBOX_RECEIVE);
      return (await jsonFiles(this.pendingDir(config.name), config.maxMessages)).length > 0;
    });
  }

  async revoke(handle: CapabilityHandle): Promise<void> {
    const { config } = await this.resolve(handle,
      parseCapabilityHandle(handle).capability === MAILBOX_SEND ? MAILBOX_SEND : MAILBOX_RECEIVE);
    await this.withMailboxLock(config.name, () => this.revokeLocked(handle));
  }

  private async revokeLocked(handle: CapabilityHandle): Promise<void> {
    const { record } = await this.resolve(
      handle,
      parseCapabilityHandle(handle).capability === MAILBOX_SEND
        ? MAILBOX_SEND
        : MAILBOX_RECEIVE,
    );
    record.revoked = true;
    await writeReplace(this.recordPath(handle), record as unknown as JsonValue);
  }

  async send(
    handle: CapabilityHandle,
    value: JsonValue,
    idempotencyKey: Digest,
  ): Promise<{ id: Digest }> {
    const { config } = await this.resolve(handle, MAILBOX_SEND);
    return this.withMailboxLock(config.name, () => this.sendLocked(handle, value, idempotencyKey));
  }

  private async sendLocked(
    handle: CapabilityHandle,
    value: JsonValue,
    idempotencyKey: Digest,
  ): Promise<{ id: Digest }> {
    idempotencyKey = asDigest(idempotencyKey, "mailbox idempotency key");
    value = asJsonValue(value, "mailbox message");
    const { config } = await this.resolve(handle, MAILBOX_SEND);
    await this.guard(config.name);
    const bytes = canonicalBytes(value);
    if (bytes > config.maxMessageBytes) {
      throw new AlgalError(
        "BUDGET_EXHAUSTED",
        `mailbox message ${bytes}B exceeds ${config.maxMessageBytes}B`,
      );
    }
    const id = digestCanonical(messageEnvelope(config.name, idempotencyKey, value));
    const file = `${idempotencyKey.slice(7)}.json`;
    const messagePath = join(this.messagesDir(config.name), file);
    const pendingPath = join(this.pendingDir(config.name), file);
    const consumedPath = join(this.consumedDir(config.name), file);
    await noLink(messagePath);
    await noLink(pendingPath);
    await noLink(consumedPath);
    const validateMessage = (raw: unknown): void => {
      const message = parseMessage(raw, `mailbox message ${idempotencyKey}`);
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
    const existingMessage = await readJson(messagePath);
    if (existingMessage !== undefined) {
      validateMessage(existingMessage);
    } else {
      for (const markerPath of [pendingPath, consumedPath]) {
        if (await readJson(markerPath) !== undefined) {
          throw new AlgalError("DIGEST_MISMATCH", "mailbox delivery has no message claim");
        }
      }
      const pending = await jsonFiles(this.pendingDir(config.name), config.maxMessages);
      if (pending.length >= config.maxMessages) {
        throw new AlgalError("MAILBOX_FULL", `mailbox "${config.name}" is full`);
      }
      const message: MailboxMessage = {
        contract: MAILBOX_MESSAGE_CONTRACT,
        id,
        mailbox: config.name,
        idempotencyKey,
        value,
      };
      if (!await writeNew(messagePath, message as unknown as JsonValue)) {
        validateMessage(await readJson(messagePath));
      }
    }
    for (const markerPath of [pendingPath, consumedPath]) {
      const marker = await readJson(markerPath);
      if (marker === undefined) continue;
      if (parseDelivery(marker, `mailbox delivery ${idempotencyKey}`).id !== id) {
        throw new AlgalError("DIGEST_MISMATCH", "mailbox delivery claims another message");
      }
      return { id };
    }
    const pending = await jsonFiles(this.pendingDir(config.name), config.maxMessages);
    if (pending.length >= config.maxMessages) {
      throw new AlgalError("MAILBOX_FULL", `mailbox "${config.name}" is full`);
    }
    const delivery: MailboxDelivery = {
      contract: MAILBOX_DELIVERY_CONTRACT,
      id,
    };
    if (!await writeNew(pendingPath, delivery as unknown as JsonValue)) {
      const claimed = parseDelivery(
        await readJson(pendingPath),
        `mailbox delivery ${idempotencyKey}`,
      );
      if (claimed.id !== id) {
        throw new AlgalError("DIGEST_MISMATCH", "mailbox delivery raced another message");
      }
    }
    return { id };
  }

  async receive(
    handle: CapabilityHandle,
  ): Promise<{ id: Digest; message: JsonValue }> {
    const { config } = await this.resolve(handle, MAILBOX_RECEIVE);
    return this.withMailboxLock(config.name, () => this.receiveLocked(handle));
  }

  private async receiveLocked(
    handle: CapabilityHandle,
  ): Promise<{ id: Digest; message: JsonValue }> {
    const { config } = await this.resolve(handle, MAILBOX_RECEIVE);
    await this.guard(config.name);
    for (let attempt = 0; attempt < 16; attempt++) {
      const pending = await jsonFiles(this.pendingDir(config.name), config.maxMessages);
      if (pending.length === 0) {
        throw new AlgalError(
          "EFFECT_SUSPENDED",
          `mailbox "${config.name}" is empty`,
          suspensionDetails(handle),
        );
      }
      for (const file of pending) {
        const source = join(this.pendingDir(config.name), file);
        const marker = await readJson(source);
        if (marker === undefined) continue;
        const delivery = parseDelivery(marker, `mailbox delivery ${file}`);
        const message = parseMessage(
          await readJson(join(this.messagesDir(config.name), file)),
          `mailbox message ${file}`,
        );
        if (
          delivery.id !== message.id ||
          `${message.idempotencyKey.slice(7)}.json` !== file ||
          message.mailbox !== config.name
        ) {
          throw new AlgalError("DIGEST_MISMATCH", `mailbox delivery ${file} is corrupt`);
        }
        try {
          await rename(source, join(this.consumedDir(config.name), file));
          return { id: message.id, message: message.value };
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
      }
    }
    throw new AlgalError(
      "EFFECT_SUSPENDED",
      `mailbox "${config.name}" is busy`,
      suspensionDetails(handle),
    );
  }
}

export function mailboxToolRegistry(service: MailboxService): ToolRegistry {
  return new Map([
    [
      MAILBOX_SEND_TOOL,
      {
        configurationDigest: digestCanonical({contract: "algal.process-tool-binding.v1", tool: MAILBOX_SEND_TOOL, driver: "builtin"}),
        signature: {
          inputs: {
            mailbox: { type: "cap", capability: MAILBOX_SEND },
            message: { type: "json" },
          },
          outputs: { id: { type: "text" } },
          effect: "write" as const,
          cost: 100,
          maxOutputBytes: 256,
        },
        tool: async (inputs, context) => service.send(
          parseCapabilityHandle(inputs.mailbox, MAILBOX_SEND).handle,
          inputs.message!,
          context.idempotencyKey,
        ),
      },
    ],
    [
      MAILBOX_RECEIVE_TOOL,
      {
        configurationDigest: digestCanonical({contract: "algal.process-tool-binding.v1", tool: MAILBOX_RECEIVE_TOOL, driver: "builtin"}),
        signature: {
          inputs: {
            mailbox: { type: "cap", capability: MAILBOX_RECEIVE },
          },
          outputs: {
            id: { type: "text" },
            message: { type: "json" },
          },
          effect: "write" as const,
          cost: 100,
          maxOutputBytes: BOUNDS.maxValueBytes,
        },
        tool: async (inputs) => service.receive(
          parseCapabilityHandle(inputs.mailbox, MAILBOX_RECEIVE).handle,
        ),
      },
    ],
  ]);
}

export function externalWakeKey(): Digest {
  return digestCanonical({
    contract: "algal.mailbox-wake.v1",
    nonce: randomBytes(32).toString("hex"),
  });
}
