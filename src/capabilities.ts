import { digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { asSafeId, type JsonValue } from "./values";

export type CapabilityHandle = `cap:${string}:${Digest}`;

const HANDLE = /^cap:([a-z][a-z0-9-]{0,63}):(sha256:[0-9a-f]{64})$/;

export function asCapabilityClass(value: unknown, what = "capability class"): string {
  return asSafeId(value, what);
}

export function capabilityHandle(
  capability: string,
  descriptor: JsonValue,
): CapabilityHandle {
  const checked = asCapabilityClass(capability);
  return `cap:${checked}:${digestCanonical(descriptor)}`;
}

export function parseCapabilityHandle(
  value: unknown,
  expected?: string,
  what = "capability handle",
): { handle: CapabilityHandle; capability: string; digest: Digest } {
  if (typeof value !== "string") {
    throw new AlgalError("TYPE_MISMATCH", `${what} must be an opaque capability handle`);
  }
  const match = HANDLE.exec(value);
  if (!match) {
    throw new AlgalError("TYPE_MISMATCH", `${what} is not a valid capability handle`);
  }
  const capability = match[1]!;
  if (expected !== undefined && capability !== expected) {
    throw new AlgalError(
      "TYPE_MISMATCH",
      `${what} carries ${capability}, expected ${expected}`,
    );
  }
  return {
    handle: value as CapabilityHandle,
    capability,
    digest: match[2] as Digest,
  };
}
