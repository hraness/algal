/**
 * ALGAL's launch film: an agent acts before you can stop it, the reveal, the
 * built-in demo stopping for approval with its captured output, crashes that
 * neither redo finished steps nor resend a write, offline verification, and
 * an end card that asks your agent to install ALGAL. Output lines come from
 * site/launch/demo-fixture.json (captured from the released CLI); numbers and
 * status from site/launch/facts.ts.
 */
import { join } from "node:path";

import demo from "../../site/launch/demo-fixture.json" with { type: "json" };
import { launchFacts } from "../../site/launch/facts.ts";
import { defineStory } from "./story.ts";
import palette from "./palette.json" with { type: "json" };

const repo = join(import.meta.dir, "../..");
const f = (key: keyof typeof launchFacts) => launchFacts[key].value;
const start = demo.start, prove = demo.prove;

export default () => defineStory({
  id: "algal",
  brand: {
    wordmark: "ALGAL",
    mark: join(repo, "site/algal-mark.svg"),
    markAspect: 1,
    // Read with site-palette.ts from https://algal.computer in dark mode; see palette.json.
    palette: { values: palette.palette },
    designKit: join(repo, "node_modules/@hraness/design-kit"),
  },
  acts: [
    { kind: "chat", headline: "An agent that acts can act before you can stop it.", accents: ["before"], sample: true, exchanges: [
      { you: "Publish the report when it's ready.", agent: "Done. I published it, and sent it twice after a restart." },
    ] },
    { kind: "reveal", tagline: "Agent programs that stop and wait for you." },
    {
      kind: "terminal", headline: "The program stops before it acts, and waits for your yes.", accents: ["stops", "waits"],
      title: "algal demo",
      lines: [
        { cmd: "algal demo start ./my-review" },
        { out: `status ${start.status} · stage ${start.stage} · proposals ${start.counters.proposals} · publications ${start.counters.publications}`, tone: "muted" },
        { cmd: "algal demo approve ./my-review --proposal sha256:… --action publish-local-report" },
        { out: `status ${prove.approval.status} · publications ${prove.approval.publications}`, tone: "ok" },
      ],
    },
    {
      kind: "cards", headline: "A crash doesn't redo finished work or resend a write.", accents: ["redo", "resend"],
      items: [
        { tag: "Crash", title: `The demo crashes the program ${f("crashCount")} on purpose` },
        { tag: "Finished", title: `Finished steps are picked up, not redone: ${f("finishedStepDeliveries")} delivery` },
        { tag: "In flight", title: `An uncertain write is refused, not resent: ${f("inFlightWriteDeliveries")} delivery` },
      ],
    },
    {
      kind: "terminal", headline: "Check the whole run on another machine.", accents: ["another", "machine."],
      title: "algal demo",
      lines: [
        { cmd: "algal demo export ./my-review > review.evidence.json" },
        { cmd: "algal demo verify ./review.evidence.json" },
        { out: `ok ${prove.portable.verification.ok} · generations ${prove.portable.verification.generations} · receipts ${prove.portable.verification.receipts}`, tone: "ok" },
      ],
    },
  ],
  end: {
    lead: "Ask your agent:", prompt: "Install ALGAL from algal.computer",
    terms: `${f("status")} · ${f("license")} licensed · No model account needed for the demo`, url: "algal.computer",
  },
  formats: ["wide", "square", "portrait"],
});
