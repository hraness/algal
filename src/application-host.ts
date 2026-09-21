/** Declarative application host policy: `algal.application-host.v1` admits a
 * single application with a pinned mutation frontier, attestation-checked
 * scopes, decoder policies that admit self-describing raw evidence
 * (`rawContract` records carrying claims) bound by receipts that name the
 * raw digest, route→delivery plans, and episode bindings that fence the
 * captured state exactly. Its dispatcher settles `deliver` intents by
 * appending the message digest to a durable channel file; episodes require
 * a domain dispatcher and are blocked honestly. Both runtimes implement the
 * same record so `scripts/application-parity.ts` exercises one policy. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { applicationId, applicationJson, applicationList, applicationObject, applicationRef, applicationTag } from "./application-contract";
import type { ApplicationAdmission, ApplicationDispatchContext, ApplicationDispatcher } from "./application";
import { applicationProcessName } from "./application";
import type { MemoryAdmissionHost, MemoryClaim } from "./application-memory";
import { parseMemoryClaim } from "./application-memory";
import { parseCapabilityHandle } from "./capabilities";
import { digestCanonical, type Digest } from "./digest";
import { asObject, canonicalize, type JsonValue } from "./values";

const json = applicationJson;
const ref = (value: unknown): Digest => digestCanonical(json(value));
function boundedText(value: unknown, max: number): string {
  if (typeof value !== "string" || value.length === 0 || Buffer.byteLength(value) > max || value.includes("\0")) throw new Error("Invalid host policy text");
  return value;
}

export interface ApplicationHostPolicy {
  readonly application: string;
  readonly frontier: Digest;
  readonly hostProfile: Digest;
  readonly episodeAccess: "observe" | "external-write";
  readonly routes: ReadonlyMap<string, { recipient: string; hostProfile: Digest }>;
  readonly attestation: string | null;
  readonly decoders: ReadonlyMap<Digest, { rawContract: string; receiptContract: string }>;
  readonly value: JsonValue;
}

export function parseApplicationHostPolicy(input: unknown): ApplicationHostPolicy {
  const v = applicationObject(input, ["contract", "application", "frontier", "hostProfile", "episodeAccess", "routes", "attestation", "decoders"]);
  applicationTag(v.contract, "algal.application-host.v1");
  if (v.episodeAccess !== "observe" && v.episodeAccess !== "external-write") throw new Error("Invalid episode access");
  const routes = new Map<string, { recipient: string; hostProfile: Digest }>();
  let previousRoute = "";
  for (const row of applicationList(v.routes, 16, r => applicationObject(r, ["route", "recipient", "hostProfile"]))) {
    const route = applicationId(row.route);
    if (route <= previousRoute) throw new Error("Host routes must be sorted and unique");
    previousRoute = route;
    routes.set(route, { recipient: parseCapabilityHandle(row.recipient, "mailbox-send").handle, hostProfile: applicationRef(row.hostProfile) });
  }
  const decoders = new Map<Digest, { rawContract: string; receiptContract: string }>();
  let previousDecoder = "";
  for (const row of applicationList(v.decoders, 16, d => applicationObject(d, ["decoder", "rawContract", "receiptContract"]))) {
    const decoder = applicationRef(row.decoder);
    if (decoder <= previousDecoder) throw new Error("Host decoder policies must be sorted and unique");
    previousDecoder = decoder;
    decoders.set(decoder, { rawContract: boundedText(row.rawContract, 128), receiptContract: boundedText(row.receiptContract, 128) });
  }
  return {
    application: applicationId(v.application), frontier: applicationRef(v.frontier), hostProfile: applicationRef(v.hostProfile),
    episodeAccess: v.episodeAccess, routes, attestation: v.attestation === null ? null : boundedText(v.attestation, 128), decoders,
    value: json(input),
  };
}

/** Channel file: `channelsDir/<route>.json` holds `{contract: "algal.host-channel.v1", route, outcomes: Digest[]}`. */
async function readChannel(channelsDir: string, route: string): Promise<Digest[]> {
  const raw = await readFile(join(channelsDir, `${route}.json`), "utf8").catch(() => null);
  if (raw === null) return [];
  const v = applicationObject(JSON.parse(raw) as unknown, ["contract", "route", "outcomes"]);
  applicationTag(v.contract, "algal.host-channel.v1");
  if (v.route !== route) throw new Error("Channel route mismatch");
  return applicationList(v.outcomes, 4096, applicationRef);
}
async function writeChannel(channelsDir: string, route: string, outcomes: Digest[]): Promise<void> {
  await mkdir(channelsDir, { recursive: true });
  await writeFile(join(channelsDir, `${route}.json`), canonicalize({ contract: "algal.host-channel.v1", route, outcomes }), "utf8");
}

/** One object implementing the three host traits; `identity` and
 * `configurationDigest` bind the exact policy digest so a policy change is
 * a new host, never silent drift. */
export function createApplicationPolicyHost(input: unknown, options: { channelsDir: string }): ApplicationAdmission & MemoryAdmissionHost & ApplicationDispatcher {
  const policy = parseApplicationHostPolicy(input);
  const identity = ref({ contract: "algal.host-admission.v1", policy: ref(policy.value) });
  const configurationDigest = ref({ contract: "algal.host-dispatcher.v1", policy: ref(policy.value) });
  const channelsDir = options.channelsDir;
  return {
    identity,
    configurationDigest,
    async admitCommit() {},
    async admitDispatch({ snapshot, intent }) {
      if (intent.kind === "deliver") {
        const route = policy.routes.get(intent.route);
        if (!route) throw new Error("Host policy denies this route");
        return { kind: "delivery" as const, recipient: route.recipient, hostProfile: route.hostProfile };
      }
      const entry = snapshot.revision.entrypoints.find(e => e.name === intent.entrypoint);
      if (!entry) throw new Error("Unknown episode entrypoint");
      const intentRef = digestCanonical(json(intent));
      return {
        kind: "episode" as const,
        binding: {
          contract: "algal.application-episode.v1" as const, application: intent.application, intent: intentRef,
          sourceState: snapshot.digest, revision: snapshot.state.revision, memory: snapshot.state.memory,
          epoch: snapshot.state.epoch, entrypoint: entry.name, manifest: entry.manifest, arguments: intent.input,
          process: applicationProcessName(intent.application, intentRef), maxGenerations: entry.maxGenerations,
          hostProfile: policy.hostProfile, access: policy.episodeAccess,
        },
      };
    },
    async currentFrontier(application) {
      if (application !== policy.application) throw new Error("Frontier requested for another application");
      return policy.frontier;
    },
    async validateScope({ scope, attestation }) {
      if (scope.application !== policy.application) throw new Error("Cross-application scope");
      if (policy.attestation !== null && asObject(attestation, "scope attestation")["contract"] !== policy.attestation) throw new Error("Scope attestation is not the admitted contract");
    },
    async decodeObservation({ observation, raw, receipt }): Promise<MemoryClaim[]> {
      const decoder = policy.decoders.get(observation.decoder);
      if (!decoder) throw new Error("Host policy denies this decoder");
      // The contract binds the evidence kind, not the record shape: lifecycle
      // records such as algal.application-migration.v1 legitimately carry
      // claims alongside their other fields.
      const bounded = asObject(raw, "raw evidence");
      if (bounded["contract"] !== decoder.rawContract) throw new Error("Raw evidence is not the admitted contract");
      const claims = applicationList(bounded["claims"], 32, parseMemoryClaim);
      const proof = asObject(receipt, "observation receipt");
      if (proof["contract"] !== decoder.receiptContract || proof["raw"] !== observation.raw) throw new Error("Receipt does not bind the raw evidence");
      return claims;
    },
    async dispatch(context: ApplicationDispatchContext) {
      const work = context.intent;
      if (work.kind !== "deliver") return { status: "blocked" as const, reason: "Episode execution requires a domain dispatcher" };
      const outcomes = await readChannel(channelsDir, work.route);
      if (!outcomes.includes(work.message)) {
        outcomes.push(work.message);
        if (outcomes.length > 4096) throw new Error("Channel bound exceeded");
        await writeChannel(channelsDir, work.route, outcomes);
      }
      return { status: "settled" as const, result: { kind: "delivery" as const, message: work.message, idempotencyKey: context.dispatch.identity } };
    },
    async reconcile(context: ApplicationDispatchContext) {
      const work = context.intent;
      if (work.kind !== "deliver") return undefined;
      const outcomes = await readChannel(channelsDir, work.route);
      if (!outcomes.includes(work.message)) return undefined;
      return { status: "settled" as const, result: { kind: "delivery" as const, message: work.message, idempotencyKey: context.dispatch.identity } };
    },
  };
}
