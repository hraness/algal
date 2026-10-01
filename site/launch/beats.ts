// "Introducing ALGAL" as launch beats: each one is a standalone post with its
// own visual. The blog post renders them in order, and the social kit
// (X, Bluesky, Threads, LinkedIn, and the Product Hunt / Show HN fact sheet)
// is cut from the same beats. Numbers come from ./facts.ts; the status comes
// from the release record. The design kit rejects a beat that types a digit.
import {
  assertLaunchKit,
  buildSocialKit,
  resolveLaunchBeats,
  type LaunchBeat,
  type LaunchKitOptions,
  type LaunchMessaging,
  type LaunchRelease,
  type SocialKit,
} from "@hraness/design-kit/launch";
import { portfolioProducts } from "@hraness/design-kit/portfolio";

import { LAUNCH_STATUS, launchFacts } from "./facts";

export const LAUNCH_POST_SLUG = "introducing-algal";
export const LAUNCH_POST_URL = `https://algal.computer/blog/${LAUNCH_POST_SLUG}/`;

const authoredBeats: readonly LaunchBeat[] = [
  {
    id: "what",
    part: "what",
    headline: "ALGAL runs agent programs that stop and wait for you",
    post: "ALGAL is a programming language and VM for AI agent programs. A program can stop before it acts, hold until you say yes, pick up after a crash, and replay exactly what it did.",
    visual: { kind: "mockup", id: "first-run", state: {} },
    alt: "Illustration of a terminal: algal demo start stops with status waiting and points to a local report page.",
  },
  {
    id: "approve",
    part: "does",
    headline: "Review the proposed action before it runs",
    post: "The demo records a proposed local publication and waits. Read the action on its report page, then approve or deny it with one command. Denying it leaves that publication undone.",
    visual: { kind: "mockup", id: "approval-page", state: { view: "decision" } },
    alt: "Illustration of the demo's report page: the one action the program wants, where it goes, and approve or deny.",
    detailHref: "/docs/native-workbench/",
  },
  {
    id: "history",
    part: "does",
    headline: "Every step is saved as it happens",
    post: "The demo saves its steps to disk with content fingerprints. Its report page lets you inspect the recorded inputs, proposed action and decisions together.",
    visual: { kind: "mockup", id: "approval-page", state: { view: "history" } },
    alt: "Illustration of the report page's History tab: each saved step with its status and a short fingerprint.",
  },
  {
    id: "crash",
    part: "does",
    headline: "Resume finished work after a crash",
    post: "The built-in demo crashes a program {crashCount} on purpose. Finished steps are picked up, not redone. When ALGAL cannot tell whether a write went out, it stops and refuses to send it again.",
    visual: { kind: "mockup", id: "crash", state: {} },
    alt: "Illustration of algal demo prove: a finished step is reused after one crash, and an uncertain write is not resent.",
    facts: ["crashCount"],
  },
  {
    id: "verify",
    part: "how",
    headline: "Check a whole run on another machine",
    post: "Export a run to one file and check it on another machine with algal demo verify. It replays the saved history and confirms every step lines up. It shows the run is consistent; it does not prove who ran it.",
    socialPost: "Export a run to one file and check it on another machine with algal demo verify. It replays the saved history and confirms every step lines up.",
    visual: { kind: "mockup", id: "verify", state: {} },
    alt: "Illustration of exporting the demo's history to one file and checking it offline, which reports ok true.",
  },
  {
    id: "who",
    part: "who",
    headline: "For agents that touch real things",
    post: "ALGAL is for developers whose agents send messages, change code, or publish files, where one wrong action costs something. If your agent only answers questions and never acts, a plain script or chat app is simpler.",
    socialPost: "ALGAL is for developers whose agents send messages, change code, or publish files, where one wrong action costs something.",
    visual: { kind: "mockup", id: "approval-page", state: { view: "approved" } },
    alt: "Illustration of the report page after approval: the approval and the local publication are both marked done.",
    detailHref: "/use-cases/",
  },
  {
    id: "vision",
    part: "vision",
    headline: "The bet: software that gets better at its job",
    post: "ALGAL programs are data you can read, compare, and replay. The bet is that a computer can keep tested ways of working and reuse them on the next task. That is an open experiment, not a result yet.",
    socialPost: "ALGAL programs are data you can read, compare, and replay. The bet is that a computer can keep tested ways of working and reuse them on the next task.",
    visual: { kind: "diagram", src: "/diagrams/refine.svg" },
    alt: "Diagram of the refine example, an ALGAL program that revises a draft in a loop, then ships or holds it.",
    detailHref: "/docs/vision/",
  },
  {
    id: "limits",
    part: "limits",
    headline: "Keep host permissions explicit",
    post: "Your app decides which tools a program may use and how the process is isolated. A run record can travel independently; resuming a saved process still requires its local store and host capabilities.",
    visual: { kind: "mockup", id: "status", state: {} },
    alt: "Illustration of a status card explaining host-controlled permissions and local process storage.",
  },
  {
    id: "status",
    part: "status",
    headline: "Try it in one command",
    post: "ALGAL runs on {platforms}. The demo needs no model account: install with one command, then run algal demo start.",
    socialPost: "Status: {status}. ALGAL runs on {platforms}. The free, open source demo needs no model account: install with one command, then run algal demo start.",
    visual: { kind: "mockup", id: "install", state: {} },
    alt: "Illustration of installing ALGAL with one command and starting the built-in demo.",
    facts: ["status", "platforms"],
    detailHref: "/docs/native-release/",
  },
];

/** The beats with every {placeholder} filled from the launch facts. x86_64 is a name, not a number. */
export const launchBeats: readonly LaunchBeat[] = resolveLaunchBeats(authoredBeats, launchFacts, { allowNumerals: ["x86_64"] });

const algal = portfolioProducts.algal;

/**
 * The messaging record from the portfolio registry. The Product Hunt
 * description uses the registry's `short` line: its `meta` line says
 * "receipts", which launch copy treats as internal vocabulary.
 */
export const launchMessaging: LaunchMessaging = {
  names: { name: algal.messaging.names.name },
  tagline: algal.messaging.tagline,
  meta: algal.messaging.short,
};

export const launchRelease: LaunchRelease = {
  status: LAUNCH_STATUS,
  tags: ["Developer Tools", "Artificial Intelligence", "Open Source"],
};

/** The release record has a public install script and archives, so the kit may say "install". */
export const launchKitOptions: LaunchKitOptions = {
  status: LAUNCH_STATUS,
  publicInstall: true,
  tagline: launchMessaging.tagline,
  canonicalUrl: LAUNCH_POST_URL,
  forbiddenNames: ["LangGraph", "Temporal", "Restate", "Inngest", "BAML", "DSPy"],
};

export const socialKit: SocialKit = buildSocialKit(launchBeats, launchMessaging, launchRelease, LAUNCH_POST_URL);
assertLaunchKit(launchBeats, socialKit, launchKitOptions);
