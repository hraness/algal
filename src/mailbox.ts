import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import {
  lstat,
  open,
  opendir,
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
import { AlgalError, errorReport } from "./errors";
import { durableStep, durableUnlink, ensureDurableDirectory, publishFile, syncRetainedFile } from "./durable-fs";
import { hostLease } from "./host-state";
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
  // Count every physical entry before filtering files or orphan directories.
  maxDirectoryEntries: 2064,
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

async function readJson(path: string, retain?: (value: unknown) => void): Promise<unknown | undefined> {
  const maximum = 67_108_864; // Same host-artifact ceiling as the native reader.
  try {
    const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      const info = await file.stat();
      if (!info.isFile() || info.size > maximum) {
        throw new AlgalError("BUDGET_EXHAUSTED", "mailbox artifact file type or bytes");
      }
      const chunks: Buffer[] = [];
      let size = 0;
      for (;;) {
        const buffer = Buffer.alloc(Math.min(65_536, maximum + 1 - size));
        const { bytesRead } = await file.read(buffer, 0, buffer.length, null);
        if (bytesRead === 0) break;
        size += bytesRead;
        if (size > maximum) throw new AlgalError("BUDGET_EXHAUSTED", "mailbox artifact bytes");
        chunks.push(buffer.subarray(0, bytesRead));
      }
      try {
        const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(Buffer.concat(chunks));
        const value: unknown = JSON.parse(text);
        if (retain) { retain(value); await syncRetainedFile(file, path); }
        return value;
      } catch (error) {
        if (error instanceof AlgalError) throw error;
        if (!(error instanceof SyntaxError) && !(error instanceof TypeError)) throw error;
        throw new AlgalError("PARSE_FAILED", `${path}: ${error instanceof Error ? error.message : String(error)}`);
      }
    } finally { await file.close(); }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    if ((error as NodeJS.ErrnoException).code === "ELOOP") {
      throw new AlgalError("IO_FAILED", "mailbox symlinks are not admitted");
    }
    throw error;
  }
}

async function writeNew(path: string, value: JsonValue): Promise<boolean> {
  const bytes = canonicalize(value);
  if (await publishFile(path, bytes)) return true;
  const retained = await readJson(path, raw => {
    if (canonicalize(asJsonValue(raw, "retained mailbox record")) !== bytes) {
      throw new AlgalError("DIGEST_MISMATCH", "immutable mailbox publication conflicts");
    }
  });
  if (retained === undefined) {
    throw new AlgalError("IO_FAILED", "retained mailbox publication disappeared");
  }
  return false;
}

async function writeReplace(path: string, value: JsonValue): Promise<void> {
  await publishFile(path, canonicalize(value), true);
}

async function jsonFiles(path: string, max: number): Promise<string[]> {
  const files: string[] = [];
  let scanned = 0;
  try {
    const directory = await opendir(path);
    for await (const entry of directory) {
      if (++scanned > max * 2 + 16) throw new AlgalError("BUDGET_EXHAUSTED", "mailbox directory physical entry bound exceeded");
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
    // One shared Bun/Rust admission lease protects both identity and capacity.
    return hostLease(join(this.dir, ".mailbox-admission"), "mailbox-admission",
      () => this.createLocked(checked, bounds));
  }

  private async createLocked(
    checked: string,
    bounds: { maxMessages: number; maxMessageBytes: number },
  ): Promise<MailboxConfig> {
    await this.guard(checked);
    const existing = await this.inspect(checked);
    if (existing) {
      if (
        existing.maxMessages !== bounds.maxMessages ||
        existing.maxMessageBytes !== bounds.maxMessageBytes
      ) {
        throw new AlgalError("PARSE_FAILED", `mailbox "${checked}" already has different bounds`);
      }
      await this.retainConfig(existing);
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
    await ensureDurableDirectory(join(mailboxDir, "messages"));
    await ensureDurableDirectory(join(mailboxDir, "pending"));
    await ensureDurableDirectory(join(mailboxDir, "consumed"));
    await ensureDurableDirectory(join(this.dir, "capabilities"));
    await this.guard(checked);
    await writeNew(this.recordPath(send.handle), send as unknown as JsonValue);
    await writeNew(this.recordPath(receive.handle), receive as unknown as JsonValue);
    if (!await writeNew(this.configPath(checked), config as unknown as JsonValue)) {
      const raced = await this.inspect(checked);
      if (!raced) throw new AlgalError("IO_FAILED", "mailbox creation raced without a config");
      if (raced.maxMessages !== bounds.maxMessages || raced.maxMessageBytes !== bounds.maxMessageBytes) {
        throw new AlgalError("PARSE_FAILED", `mailbox "${checked}" already has different bounds`);
      }
      await this.retainConfig(raced);
      return raced;
    }
    return config;
  }

  async list(): Promise<MailboxConfig[]> {
    await this.guard();
    const root = join(this.dir, "mailboxes");
    const configs: MailboxConfig[] = [];
    try {
      // Bun may defer opendir's ENOENT until iteration. Only absence observed
      // before enumeration is empty; later IO failures must remain failures.
      await lstat(root);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    const directory = await opendir(root);
    let scanned = 0;
    for await (const entry of directory) {
      if (++scanned > MAILBOX_BOUNDS.maxDirectoryEntries) {
        throw new AlgalError("BUDGET_EXHAUSTED", "mailbox namespace physical entry bound exceeded");
      }
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

  private async retainConfig(config: MailboxConfig): Promise<void> {
    for (const handle of [config.send, config.receive]) {
      const retained = await readJson(this.recordPath(handle), raw => {
        const record = parseRecord(raw, "retained mailbox capability");
        // Revoked records remain revoked; creation never mints replacements.
        if (record.handle !== handle || record.mailbox !== config.name) {
          throw new AlgalError("DIGEST_MISMATCH", "mailbox authority does not match its configuration");
        }
      });
      if (retained === undefined) throw new AlgalError("DIGEST_MISMATCH", "mailbox configuration has no authority record");
    }
    const retained = await readJson(this.configPath(config.name), raw => {
      if (canonicalize(parseConfig(raw, "retained mailbox config") as unknown as JsonValue) !== canonicalize(config as unknown as JsonValue)) {
        throw new AlgalError("DIGEST_MISMATCH", "mailbox configuration changed during publication");
      }
    });
    if (retained === undefined) throw new AlgalError("IO_FAILED", "retained mailbox configuration disappeared");
    for (const path of [this.messagesDir(config.name), this.pendingDir(config.name), this.consumedDir(config.name)]) {
      // A clean existing layout must already have all three directories.
      const stat = await lstat(path);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new AlgalError("IO_FAILED", "mailbox directory is not admitted");
      await ensureDurableDirectory(path);
    }
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

  private async withMailboxLock<T>(name: string, operation: (markMutation: () => void) => Promise<T>): Promise<T> {
    await this.guard(name);
    for (const directory of [this.messagesDir(name), this.pendingDir(name), this.consumedDir(name), join(this.dir, "capabilities")]) {
      const info = await lstat(directory);
      if (!info.isDirectory() || info.isSymbolicLink()) throw new AlgalError("IO_FAILED", "admitted mailbox directory is missing or invalid");
    }
    const path = join(this.dir, "mailboxes", asSafeId(name, "mailbox name"), ".lock");
    let lock: Awaited<ReturnType<typeof open>> | undefined;
    let failed = false;
    let failure: unknown;
    let result: T | undefined;
    let mutationAttempted = false;
    try {
      await durableStep("create-lock", path, async () => { lock = await open(path, "wx", 0o600); });
      result = await operation(() => { mutationAttempted = true; });
    } catch (error) {
      failed = true;
      failure = !lock && (error as NodeJS.ErrnoException).code === "EEXIST"
        ? new AlgalError("IO_FAILED", `mailbox "${name}" is locked; reconcile the owning operation before retrying`)
        : error;
    }
    if (lock) {
      try {
        await lock.close();
        // Exactly one release attempt. A failed post-unlink barrier must never
        // trigger a second unlink against another caller's reused lock path.
        await durableUnlink(path, "unlink-lock");
      } catch (error) { if (!failed) { failed = true; failure = error; } }
    }
    if (failed) {
      if (mutationAttempted) {
        // An attempted publication may have taken effect even when it throws,
        // and a successful transfer is not settled until lock release returns.
        // Keep the wire error unchanged; this flag only governs host recovery.
        const report = errorReport(failure);
        throw new AlgalError(report.code, report.message, failure instanceof AlgalError ? failure.details : undefined, { uncertain: true });
      }
      throw failure;
    }
    return result as T;
  }

  async hasPending(handle: CapabilityHandle): Promise<boolean> {
    const { config } = await this.resolve(handle, MAILBOX_RECEIVE);
    return this.withMailboxLock(config.name, async () => {
      await this.resolve(handle, MAILBOX_RECEIVE);
      return (await this.unambiguousPending(config)).length > 0;
    });
  }

  async revoke(handle: CapabilityHandle): Promise<void> {
    const { config } = await this.resolve(handle,
      parseCapabilityHandle(handle).capability === MAILBOX_SEND ? MAILBOX_SEND : MAILBOX_RECEIVE);
    await this.withMailboxLock(config.name, markMutation => this.revokeLocked(handle, markMutation));
  }

  private async revokeLocked(handle: CapabilityHandle, markMutation: () => void): Promise<void> {
    const { record } = await this.resolve(
      handle,
      parseCapabilityHandle(handle).capability === MAILBOX_SEND
        ? MAILBOX_SEND
        : MAILBOX_RECEIVE,
    );
    record.revoked = true;
    markMutation();
    await writeReplace(this.recordPath(handle), record as unknown as JsonValue);
  }

  async send(
    handle: CapabilityHandle,
    value: JsonValue,
    idempotencyKey: Digest,
  ): Promise<{ id: Digest }> {
    const { config } = await this.resolve(handle, MAILBOX_SEND);
    return this.withMailboxLock(config.name, markMutation => this.sendLocked(handle, value, idempotencyKey, markMutation));
  }

  private async sendLocked(
    handle: CapabilityHandle,
    value: JsonValue,
    idempotencyKey: Digest,
    markMutation: () => void,
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
    const existingMessage = await readJson(messagePath, validateMessage);
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
      markMutation();
      if (!await writeNew(messagePath, message as unknown as JsonValue)) {
        validateMessage(await readJson(messagePath));
      }
    }
    const markers = await this.deliveryMarkers(config, file, id);
    for (const [markerPath, marker] of [[pendingPath, markers.pending], [consumedPath, markers.consumed]] as const) {
      if (marker === undefined) continue;
      const retained = await readJson(markerPath, raw => {
        if (parseDelivery(raw, `mailbox delivery ${idempotencyKey}`).id !== id) {
          throw new AlgalError("DIGEST_MISMATCH", "mailbox delivery claims another message");
        }
      });
      if (retained === undefined) throw new AlgalError("IO_FAILED", "mailbox delivery disappeared");
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
    markMutation();
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
    return this.withMailboxLock(config.name, markMutation => this.receiveLocked(handle, markMutation));
  }

  private async deliveryMarkers(config: MailboxConfig, file: string, id: Digest): Promise<{pending: unknown; consumed: unknown}> {
    const pending = await readJson(join(this.pendingDir(config.name), file));
    const consumed = await readJson(join(this.consumedDir(config.name), file));
    for (const raw of [pending, consumed]) {
      if (raw !== undefined && parseDelivery(raw, `mailbox delivery ${file}`).id !== id) {
        throw new AlgalError("DIGEST_MISMATCH", "mailbox delivery claims another message");
      }
    }
    if (pending !== undefined && consumed !== undefined) {
      throw new AlgalError("IO_FAILED", "mailbox delivery is uncertain; pending and consumed evidence require reconciliation");
    }
    return { pending, consumed };
  }

  private async unambiguousPending(config: MailboxConfig): Promise<string[]> {
    const pending = await jsonFiles(this.pendingDir(config.name), config.maxMessages);
    for (const file of pending) {
      if (await readJson(join(this.consumedDir(config.name), file)) === undefined) continue;
      const message = parseMessage(await readJson(join(this.messagesDir(config.name), file)), `mailbox message ${file}`);
      if (message.mailbox !== config.name || `${message.idempotencyKey.slice(7)}.json` !== file) {
        throw new AlgalError("DIGEST_MISMATCH", "mailbox delivery has a foreign message claim");
      }
      await this.deliveryMarkers(config, file, message.id);
    }
    return pending;
  }

  private async receiveLocked(
    handle: CapabilityHandle,
    markMutation: () => void,
  ): Promise<{ id: Digest; message: JsonValue }> {
    const { config } = await this.resolve(handle, MAILBOX_RECEIVE);
    await this.guard(config.name);
    for (let attempt = 0; attempt < 16; attempt++) {
      const pending = await this.unambiguousPending(config);
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
        const bytes = canonicalBytes(message.value);
        if (bytes > config.maxMessageBytes) {
          throw new AlgalError("BUDGET_EXHAUSTED",
            `mailbox message ${bytes}B exceeds ${config.maxMessageBytes}B`);
        }
        await this.deliveryMarkers(config, file, message.id);
        const retained = await readJson(join(this.messagesDir(config.name), file), raw => {
          const claim = parseMessage(raw, `retained mailbox message ${file}`);
          if (claim.id !== message.id || claim.mailbox !== config.name || claim.idempotencyKey !== message.idempotencyKey) {
            throw new AlgalError("DIGEST_MISMATCH", "mailbox message changed during consumption");
          }
        });
        if (retained === undefined) throw new AlgalError("IO_FAILED", "mailbox message disappeared");
        markMutation();
        await writeNew(join(this.consumedDir(config.name), file), delivery as unknown as JsonValue);
        await durableUnlink(source, "unlink-pending");
        return { id: message.id, message: message.value };
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
