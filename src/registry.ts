// fn cells are pure, host-registered functions. The manifest names a ref;
// the host registry owns the signature and implementation. A manifest can
// never introduce code — it can only compose what the host admits.

import { MorphogenError } from "./errors";
import type { JsonObject, JsonValue } from "./values";
import type { PortMap } from "./contract";

export type FnSignature = {
  inputs: PortMap;
  outputs: PortMap;
  /** Modeled work units charged per activation. */
  cost: number;
};

export type Fn = (inputs: Record<string, JsonValue>) => Record<string, JsonValue>;

export type FnRegistry = Map<string, { signature: FnSignature; fn: Fn }>;

export function builtinRegistry(): FnRegistry {
  const reg: FnRegistry = new Map();

  reg.set("echo.v1", {
    signature: {
      inputs: { value: { type: "json" } },
      outputs: { value: { type: "json" } },
      cost: 10,
    },
    fn: (i) => ({ value: i.value ?? null }),
  });

  reg.set("coalesce.v1", {
    signature: {
      inputs: {
        a: { type: "json", optional: true },
        b: { type: "json", optional: true },
        c: { type: "json", optional: true },
      },
      outputs: { value: { type: "json" } },
      cost: 10,
    },
    fn: (i) => {
      for (const k of ["a", "b", "c"]) {
        const v = i[k];
        if (v !== undefined && v !== null) return { value: v };
      }
      throw new MorphogenError("FN_FAILED", "coalesce.v1: all inputs empty");
    },
  });

  reg.set("format.v1", {
    signature: {
      inputs: {
        prefix: { type: "text" },
        value: { type: "json" },
      },
      outputs: { value: { type: "text" } },
      cost: 10,
    },
    fn: (i) => {
      const v = i.value;
      const rendered =
        typeof v === "string" ? v : JSON.stringify(v ?? null);
      return { value: `${i.prefix}${rendered}` };
    },
  });

  reg.set("tag.v1", {
    signature: {
      inputs: {
        tag: { type: "text" },
        value: { type: "json" },
      },
      outputs: { value: { type: "text" } },
      cost: 10,
    },
    fn: (i) => {
      const v = i.value;
      const rendered = typeof v === "string" ? v : JSON.stringify(v ?? null);
      return { value: `${String(i.tag).toUpperCase()}: ${rendered}` };
    },
  });

  reg.set("pick.v1", {
    signature: {
      inputs: { record: { type: "json" }, field: { type: "text" } },
      outputs: { value: { type: "json" } },
      cost: 10,
    },
    fn: (i) => {
      const rec = i.record;
      const field = i.field;
      if (typeof field !== "string") {
        throw new MorphogenError("FN_FAILED", "pick.v1: field must be text");
      }
      if (rec === null || typeof rec !== "object" || Array.isArray(rec)) {
        throw new MorphogenError("FN_FAILED", "pick.v1: record must be an object");
      }
      return { value: (rec as JsonObject)[field] ?? null };
    },
  });

  reg.set("label.v1", {
    signature: {
      inputs: { value: { type: "text" } },
      outputs: {
        value: { type: "choice", labels: ["a", "b"] },
      },
      cost: 10,
    },
    fn: (i) => ({ value: i.value === "a" ? "a" : "b" }),
  });

  return reg;
}
