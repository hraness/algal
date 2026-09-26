/** Mailbox contract, capability records, and the volatile driver. No
 * filesystem, Node, or Bun imports: a browser host shares this wire layer
 * with the file driver in `mailbox.ts` and the IndexedDB driver in
 * `mailbox-idb.ts`. Capability nonces and wake keys use ambient
 * `crypto.getRandomValues`, never a platform random source. */
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

export type CapabilityRecord = {
  contract: typeof CAPABILITY_CONTRACT;
  handle: CapabilityHandle;
  capability: typeof MAILBOX_SEND | typeof MAILBOX_RECEIVE;
  mailbox: string;
  nonce: string;
  revoked: boolean;
};

export type MailboxMessage = {
  contract: typeof MAILBOX_MESSAGE_CONTRACT;
  id: Digest;
  mailbox: string;
  idempotencyKey: Digest;
  value: JsonValue;
};

export type MailboxDelivery = {
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

export function randomHex(bytes: number): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  let hex = "";
  for (const byte of buffer) hex += byte.toString(16).padStart(2, "0");
  return hex;
}

export function descriptor(record: Pick<CapabilityRecord, "capability" | "mailbox" | "nonce">): JsonValue {
  return {
    capability: record.capability,
    contract: CAPABILITY_CONTRACT,
    mailbox: record.mailbox,
    nonce: record.nonce,
  };
}

export function newCapability(
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

export function parseConfig(value: unknown, what: string): MailboxConfig {
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

export function parseRecord(value: unknown, what: string): CapabilityRecord {
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

export function messageEnvelope(
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

export function parseMessage(value: unknown, what: string): MailboxMessage {
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

export function parseDelivery(value: unknown, what: string): MailboxDelivery {
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

export function normalizeOptions(
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
    nonce: randomHex(32),
  });
}
