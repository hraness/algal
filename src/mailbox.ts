/** Durable file-backed mailbox driver. The wire contract, capability
 * records, volatile driver, and tool bindings live in the host-independent
 * `mailbox-core.ts`; this module adds the filesystem custody layer (atomic
 * immutable publication, symlink rejection, per-mailbox create-exclusive
 * locks, and the shared Bun/Rust admission lease). */
import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import {
  link,
  lstat,
  mkdir,
  open,
  opendir,
  rename,
  unlink,
} from "node:fs/promises";
import { join } from "node:path";
import {
  parseCapabilityHandle,
  suspensionDetails,
  type CapabilityHandle,
} from "./capabilities";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { hostLease } from "./host-state";
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
import {
  asJsonValue,
  asSafeId,
  canonicalBytes,
  canonicalize,
  type JsonValue,
} from "./values";

export {
  CAPABILITY_CONTRACT,
  MAILBOX_BOUNDS,
  MAILBOX_CONTRACT,
  MAILBOX_DELIVERY_CONTRACT,
  MAILBOX_MESSAGE_CONTRACT,
  MAILBOX_RECEIVE,
  MAILBOX_RECEIVE_TOOL,
  MAILBOX_SEND,
  MAILBOX_SEND_TOOL,
  MemoryMailboxService,
  descriptor,
  externalWakeKey,
  mailboxToolRegistry,
  messageEnvelope,
  newCapability,
  normalizeOptions,
  parseConfig,
  parseDelivery,
  parseMessage,
  parseRecord,
  randomHex,
} from "./mailbox-core";
export type {
  CapabilityRecord,
  MailboxConfig,
  MailboxDelivery,
  MailboxMessage,
  MailboxService,
} from "./mailbox-core";

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
        return JSON.parse(text) as unknown;
      } catch (error) {
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
      return existing;
    }
    if ((await this.list()).length >= MAILBOX_BOUNDS.maxMailboxes) {
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
      if (raced.maxMessages !== bounds.maxMessages || raced.maxMessageBytes !== bounds.maxMessageBytes) {
        throw new AlgalError("PARSE_FAILED", `mailbox "${checked}" already has different bounds`);
      }
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
        const bytes = canonicalBytes(message.value);
        if (bytes > config.maxMessageBytes) {
          throw new AlgalError("BUDGET_EXHAUSTED",
            `mailbox message ${bytes}B exceeds ${config.maxMessageBytes}B`);
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
