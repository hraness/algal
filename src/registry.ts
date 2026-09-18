// fn cells are pure, host-registered functions. The manifest names a ref;
// the host registry owns the signature and implementation. A manifest can
// never introduce code — it can only compose what the host admits.

import { AlgalError } from "./errors";
import { canonicalize, type JsonObject, type JsonValue } from "./values";
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
      throw new AlgalError("FN_FAILED", "coalesce.v1: all inputs empty");
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
        typeof v === "string" ? v : canonicalize(v ?? null);
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
      const rendered = typeof v === "string" ? v : canonicalize(v ?? null);
      return {
        value: `${String(i.tag).replace(/[a-z]/g, (c) => c.toUpperCase())}: ${rendered}`,
      };
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
        throw new AlgalError("FN_FAILED", "pick.v1: field must be text");
      }
      if (rec === null || typeof rec !== "object" || Array.isArray(rec)) {
        throw new AlgalError("FN_FAILED", "pick.v1: record must be an object");
      }
      return { value: (rec as JsonObject)[field] ?? null };
    },
  });

  reg.set("join.v1", {
    signature: {
      inputs: {
        items: { type: "text", many: true },
        sep: { type: "text", optional: true },
      },
      outputs: { value: { type: "text" } },
      cost: 10,
    },
    fn: (i) => {
      const items = Array.isArray(i.items) ? i.items : [];
      const sep = typeof i.sep === "string" ? i.sep : "\n";
      return {
        value: items
          .map((v) => (typeof v === "string" ? v : canonicalize(v)))
          .join(sep),
      };
    },
  });

  // an invariant cell: pass value through only when it canonically equals
  // expect. A mismatch throws FN_FAILED — routable through on:"fail", so
  // "this intermediate must look like X" is a declared, enforced assertion.
  reg.set("assert.v1", {
    signature: {
      inputs: {
        value: { type: "json" },
        expect: { type: "json" },
      },
      outputs: { value: { type: "json" } },
      cost: 10,
    },
    fn: (i) => {
      const v = i.value ?? null;
      const e = i.expect ?? null;
      if (canonicalize(v) !== canonicalize(e)) {
        throw new AlgalError(
          "FN_FAILED",
          `assert.v1: value ${canonicalize(v).slice(0, 200)} != expect ${canonicalize(e).slice(0, 200)}`,
        );
      }
      return { value: v };
    },
  });

  reg.set("inc.v1", {
    signature: {
      inputs: { value: { type: "json" } },
      outputs: { value: { type: "json" } },
      cost: 5,
    },
    fn: (i) => {
      const v = i.value;
      if (typeof v !== "number" || !Number.isFinite(v)) {
        throw new AlgalError(
          "FN_FAILED",
          "inc.v1: value must be a finite number",
        );
      }
      return { value: v + 1 };
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

  reg.set("push.v1", {
    signature: {
      inputs: {
        list: { type: "json" },
        item: { type: "json" },
      },
      outputs: { value: { type: "json" } },
      cost: 5,
    },
    fn: (i) => {
      const list = i.list;
      if (!Array.isArray(list)) {
        throw new AlgalError(
          "FN_FAILED",
          "push.v1: list must be an array",
        );
      }
      return { value: [...list, i.item ?? null] };
    },
  });

  return reg;
}
