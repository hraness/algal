// Typed decisions over a bounded state — the provider-neutral layer. A
// decision provider answers declared `noul` (keep/relevance probability),
// `choice` (label from criteria keys), and `score` (rating) questions; it
// never generates text. Jev (src/jev.ts) is the first backend; any provider
// that can answer this interface plugs in through `decisionExecutor`.

import type {
  DecisionQuestion,
  DecisionQuestions,
  EffectRequest,
  Executor,
  ExecutorMetadata,
  ExecutorResult,
} from "./effects";
import { AlgalError } from "./errors";
import {
  asArray,
  asObject,
  asString,
  canonicalBytes,
  noUnknownKeys,
  optField,
  reqField,
  type JsonObject,
  type JsonValue,
} from "./values";

export type { DecisionQuestion, DecisionQuestions };

export const DECISION_BOUNDS = {
  maxQuestions: 64,
  maxQuestionNameLen: 64,
  maxInstructionsBytes: 4096,
  maxCriteria: 32,
  maxCriterionBytes: 512,
  maxStateBytes: 262_144,
} as const;

export type DecisionAnswer =
  | { type?: "noul"; noul: number }
  | {
      type?: "choice";
      choice: string;
      confidence: number;
      probabilities: Record<string, number>;
    }
  | {
      type?: "score";
      score: number;
      confidence: number;
      probabilities: Record<string, number>;
    };

export type DecisionUsage = {
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
};

export type DecisionResponse = {
  answers: Record<string, DecisionAnswer>;
  usage?: DecisionUsage;
};

export type DecisionState = JsonValue;

/** Anything that can answer typed-decision questions: a remote provider
 * client (Jev), a replay fixture, or another host adapter. The interface is
 * the contract — providers are interchangeable behind it. */
export interface DecisionAsker {
  ask(
    state: DecisionState,
    questions: DecisionQuestions,
    signal?: AbortSignal,
  ): Promise<DecisionResponse>;
}

// ------------------------------------------------------------- questions ---

function questionType(u: unknown, at: string): "noul" | "choice" | "score" {
  const t = asString(u, `${at}.type`, 16);
  if (t !== "noul" && t !== "choice" && t !== "score") {
    throw new AlgalError(
      "PARSE_FAILED",
      `${at}.type must be noul, choice, or score`,
    );
  }
  return t;
}

function instructions(u: unknown, at: string): string {
  const s = asString(u, `${at}.instructions`, DECISION_BOUNDS.maxInstructionsBytes);
  if (s.length === 0) {
    throw new AlgalError("PARSE_FAILED", `${at}.instructions must not be empty`);
  }
  return s;
}

export function parseDecisionQuestion(u: unknown, at: string): DecisionQuestion {
  const obj = asObject(u, at);
  const type = questionType(reqField(obj, "type", at), at);
  const inst = instructions(reqField(obj, "instructions", at), at);
  if (type === "noul") {
    noUnknownKeys(obj, ["type", "instructions", "criteria"], at);
    const raw = optField(obj, "criteria");
    if (raw === undefined) return { type, instructions: inst };
    const c = asObject(raw, `${at}.criteria`);
    noUnknownKeys(c, ["true", "false"], `${at}.criteria`);
    const criteria: { true?: string; false?: string } = {};
    if (c.true !== undefined)
      criteria.true = asString(c.true, `${at}.criteria.true`, DECISION_BOUNDS.maxCriterionBytes);
    if (c.false !== undefined)
      criteria.false = asString(c.false, `${at}.criteria.false`, DECISION_BOUNDS.maxCriterionBytes);
    return { type, instructions: inst, ...(Object.keys(criteria).length ? { criteria } : {}) };
  }
  if (type === "choice") {
    noUnknownKeys(obj, ["type", "instructions", "criteria"], at);
    const criteria = asObject(reqField(obj, "criteria", at), `${at}.criteria`);
    const entries = Object.entries(criteria);
    if (entries.length === 0 || entries.length > DECISION_BOUNDS.maxCriteria) {
      throw new AlgalError(
        "PARSE_FAILED",
        `${at}.criteria requires 1..${DECISION_BOUNDS.maxCriteria} entries`,
      );
    }
    const out: Record<string, string | null> = {};
    for (const [k, v] of entries) {
      asString(k, `${at}.criteria key`, DECISION_BOUNDS.maxQuestionNameLen);
      out[k] = v === null ? null : asString(v, `${at}.criteria["${k}"]`, DECISION_BOUNDS.maxCriterionBytes);
    }
    return { type, instructions: inst, criteria: out };
  }
  noUnknownKeys(obj, ["type", "instructions", "criteria"], at);
  const list = asArray(reqField(obj, "criteria", at), `${at}.criteria`);
  if (list.length === 0 || list.length > DECISION_BOUNDS.maxCriteria) {
    throw new AlgalError(
      "PARSE_FAILED",
      `${at}.criteria requires 1..${DECISION_BOUNDS.maxCriteria} entries`,
    );
  }
  return {
    type,
    instructions: inst,
    criteria: list.map((v, i) =>
      asString(v, `${at}.criteria[${i}]`, DECISION_BOUNDS.maxCriterionBytes)),
  };
}

export function parseDecisionQuestions(u: unknown, at: string): DecisionQuestions {
  const obj = asObject(u, at);
  const names = Object.keys(obj);
  if (names.length === 0 || names.length > DECISION_BOUNDS.maxQuestions) {
    throw new AlgalError(
      "PARSE_FAILED",
      `${at} requires 1..${DECISION_BOUNDS.maxQuestions} questions`,
    );
  }
  const out: DecisionQuestions = {};
  for (const name of names) {
    asString(name, `${at} question name`, DECISION_BOUNDS.maxQuestionNameLen);
    out[name] = parseDecisionQuestion(obj[name], `${at}["${name}"]`);
  }
  return out;
}

// --------------------------------------------------------------- answers ---

function finiteNumber(u: unknown, at: string): number {
  if (typeof u !== "number" || !Number.isFinite(u)) {
    throw new AlgalError(
      "EFFECT_UNPARSEABLE",
      `decision answer ${at} must be a finite number`,
    );
  }
  return u;
}

function probabilities(u: unknown, at: string): Record<string, number> {
  const obj = asObject(u, at);
  if (Object.keys(obj).length > DECISION_BOUNDS.maxCriteria) {
    throw new AlgalError(
      "EFFECT_UNPARSEABLE",
      `decision answer ${at} exceeds ${DECISION_BOUNDS.maxCriteria} entries`,
    );
  }
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = finiteNumber(v, `${at}["${k}"]`);
  }
  return out;
}

/** Strict-typed parse of one answer. The declared question type decides the
 * required shape — a noul question answered with a choice is an error. */
export function parseDecisionAnswer(
  u: unknown,
  question: DecisionQuestion,
  at: string,
): DecisionAnswer {
  const obj = asObject(u, at);
  if (question.type === "noul") {
    return { type: "noul", noul: finiteNumber(obj.noul, `${at}.noul`) };
  }
  const conf = finiteNumber(obj.confidence, `${at}.confidence`);
  const probs = probabilities(
    reqField(obj, "probabilities", at),
    `${at}.probabilities`,
  );
  if (question.type === "choice") {
    const choice = asString(
      reqField(obj, "choice", at),
      `${at}.choice`,
      DECISION_BOUNDS.maxCriterionBytes,
    );
    return { type: "choice", choice, confidence: conf, probabilities: probs };
  }
  return {
    type: "score",
    score: finiteNumber(reqField(obj, "score", at), `${at}.score`),
    confidence: conf,
    probabilities: probs,
  };
}

/** Every declared question must have an answer; extra answers are ignored. */
export function parseDecisionAnswers(
  u: unknown,
  questions: DecisionQuestions,
  at: string,
): Record<string, DecisionAnswer> {
  const raw = asObject(u, at);
  const answers: Record<string, DecisionAnswer> = {};
  for (const [name, question] of Object.entries(questions)) {
    if (!(name in raw)) {
      throw new AlgalError(
        "EFFECT_UNPARSEABLE",
        `decision response missing answer "${name}"`,
      );
    }
    answers[name] = parseDecisionAnswer(raw[name], question, `${at}["${name}"]`);
  }
  return answers;
}

/** The derived output contract for `kind:"decide"` requests:
 * `{"answers":{name:…}}` with each answer's shape fixed by its declared
 * question type. */
export function decisionAnswerSchema(questions: DecisionQuestions): JsonObject {
  const perAnswer = (q: DecisionQuestion): JsonObject =>
    q.type === "noul"
      ? {
          type: "object",
          required: ["noul"],
          properties: {
            type: { type: "string" },
            noul: { type: "number" },
          },
        }
      : q.type === "choice"
        ? {
            type: "object",
            required: ["choice", "confidence", "probabilities"],
            properties: {
              type: { type: "string" },
              choice: { type: "string" },
              confidence: { type: "number" },
              probabilities: { type: "object" },
            },
          }
        : {
            type: "object",
            required: ["score", "confidence", "probabilities"],
            properties: {
              type: { type: "string" },
              score: { type: "number" },
              confidence: { type: "number" },
              probabilities: { type: "object" },
            },
          };
  const properties: Record<string, JsonValue> = {};
  for (const [name, q] of Object.entries(questions)) {
    properties[name] = perAnswer(q) as unknown as JsonValue;
  }
  return {
    type: "object",
    required: ["answers"],
    properties: {
      answers: {
        type: "object",
        required: Object.keys(questions),
        properties,
      } as unknown as JsonValue,
    },
  };
}

// -------------------------------------------------------------- executor ---

export type DecisionExecutorOptions = {
  /** Provider adapter — Jev or any future typed-decision backend. */
  asker: DecisionAsker;
  /** Executor id for receipts and route matching (e.g. `jev`, `jev:model`). */
  id: string;
  /** Memo-scope identity; must cover provider + model + endpoint, never
   * credentials. */
  cacheIdentity: string;
};

function choiceQuestion(request: EffectRequest): DecisionQuestions {
  if (request.output.kind !== "choice") {
    throw new AlgalError(
      "EFFECT_UNPARSEABLE",
      `a decision executor cannot serve a ${request.output.kind} output — it answers typed decisions, not generated text`,
    );
  }
  const criteria: Record<string, string | null> = {};
  for (const label of request.output.labels) criteria[label] = null;
  return {
    answer: { type: "choice", instructions: request.prompt, criteria },
  };
}

/** Any `DecisionAsker` as an effect executor. `classifier` requests become
 * a single `choice` question over the declared labels; `kind:"decide"`
 * requests forward their declared question map verbatim. `gate` requests
 * are refused — approval points route to a human/policy executor, never a
 * model — and agent/text cells are refused because decision providers do
 * not generate. */
export function decisionExecutor(options: DecisionExecutorOptions): Executor {
  const usageMeta = (response: DecisionResponse): ExecutorMetadata => {
    const u = response.usage ?? {};
    const usage: NonNullable<ExecutorMetadata["usage"]> = {};
    if (u.model !== undefined) usage.model = u.model;
    if (u.tokensIn !== undefined) usage.tokensIn = u.tokensIn;
    if (u.tokensOut !== undefined) usage.tokensOut = u.tokensOut;
    return {
      executor: options.id,
      ...(Object.keys(usage).length ? { usage } : {}),
    };
  };
  const run = async (
    request: EffectRequest,
    signal?: AbortSignal,
  ): Promise<ExecutorResult> => {
    let questions: DecisionQuestions;
    let single: string | undefined;
    if (request.kind === "decide") {
      if (!request.questions) {
        throw new AlgalError(
          "EFFECT_UNPARSEABLE",
          `decide cell "${request.cellId}" declares no questions`,
        );
      }
      questions = request.questions;
    } else if (request.kind === "gate") {
      throw new AlgalError(
        "EFFECT_UNBOUND",
        "approval gates require a host approval executor, not a model",
      );
    } else if (request.kind === "classifier") {
      questions = choiceQuestion(request);
      single = "answer";
    } else {
      throw new AlgalError(
        "EFFECT_UNPARSEABLE",
        `a decision executor cannot serve kind "${request.kind}" — it answers typed decisions only`,
      );
    }
    const stateBytes = canonicalBytes(request.context) + canonicalBytes(request.prompt);
    if (stateBytes > DECISION_BOUNDS.maxStateBytes) {
      throw new AlgalError(
        "BUDGET_EXHAUSTED",
        `decision state ${stateBytes}B exceeds ${DECISION_BOUNDS.maxStateBytes}B`,
      );
    }
    const state: JsonValue = {
      prompt: request.prompt,
      context: request.context,
    } as unknown as JsonValue;
    const response = await options.asker.ask(state, questions, signal);
    const metadata = usageMeta(response);
    if (single !== undefined) {
      const answer = response.answers[single];
      if (answer === undefined || !("choice" in answer)) {
        throw new AlgalError(
          "EFFECT_UNPARSEABLE",
          `decision response missing choice answer "${single}"`,
        );
      }
      return { output: answer.choice as JsonValue, metadata };
    }
    return {
      output: { answers: response.answers } as unknown as JsonValue,
      metadata,
    };
  };
  return {
    id: options.id,
    cacheIdentity: options.cacheIdentity,
    execute: async (request, signal) => (await run(request, signal)).output,
    executeEffect: run,
  };
}
