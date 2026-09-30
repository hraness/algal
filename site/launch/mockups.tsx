// Code-built illustrations of ALGAL's first run, drawn from a real captured
// demo run (./demo-fixture.json). The homepage, the "Introducing ALGAL" post,
// and the launch film (video/) all render these same components.
//
// Terminal output is the CLI's JSON, trimmed with "…" where a field is long.
// The report page copies the words `algal demo start` writes into
// report.html. Every mockup is labelled as an illustration.
import { BrowserFrame, TerminalFrame, type TerminalLine } from "@hraness/design-kit/mockups";

import { demoFixture as demo } from "./facts";

/** sha256:5c48f4…63f4aa, the way the report page abbreviates a digest. */
export function shortDigest(digest: string): string {
  const hex = digest.replace(/^sha256:/u, "");
  return `sha256:${hex.slice(0, 6)}…${hex.slice(-6)}`;
}

const q = (text: string) => JSON.stringify(text);

export const FIRST_RUN_LINES: readonly TerminalLine[] = [
  { kind: "input", text: "algal demo start ./my-review", beat: "start" },
  { kind: "output", text: "{" },
  { kind: "output", text: `  "scenario": ${q("Inspect an exact proposal, approve or deny…")},` },
  { kind: "output", text: `  "fixture": ${q(demo.start.fixture)},` },
  { kind: "output", text: `  "stage": ${q(demo.start.stage)},`, tone: "warn", beat: "waiting" },
  { kind: "output", text: `  "status": ${q(demo.start.status)},`, tone: "warn", beat: "waiting" },
  { kind: "output", text: `  "counters": { "proposals": ${demo.start.counters.proposals}, "publications": ${demo.start.counters.publications} },` },
  { kind: "output", text: `  "artifacts": { "report": "report.html" }, …` },
  { kind: "output", text: "}" },
  { kind: "comment", text: "open my-review/report.html to approve or deny", beat: "report" },
];

export function FirstRunTerminal({ theme }: Readonly<{ theme?: "light" | "dark" }> = {}) {
  return (
    <TerminalFrame
      describe="Illustration of a terminal running algal demo start. The program stops with status waiting and points to a local report page."
      lines={FIRST_RUN_LINES}
      title="my-review · Terminal"
      {...(theme === undefined ? {} : { theme })}
    />
  );
}

const PROVE = demo.prove;
export const CRASH_LINES: readonly TerminalLine[] = [
  { kind: "input", text: "algal demo prove ./crash-lab", beat: "prove" },
  { kind: "comment", text: "crash 1: killed after a step finished; recovery reuses it", beat: "read-crash" },
  { kind: "output", text: `"readCrash": { "prefixPublications": ${PROVE.readCrash.prefixPublications}, "pendingWritePublications": ${PROVE.readCrash.pendingWritePublications} },`, tone: "ok", beat: "read-crash" },
  { kind: "comment", text: "crash 2: killed mid-write; recovery refused, nothing resent", beat: "write-crash" },
  { kind: "output", text: `"writeCrash": { "prefixPublications": ${PROVE.writeCrash.prefixPublications}, "pendingWritePublications": ${PROVE.writeCrash.pendingWritePublications} },`, tone: "warn", beat: "write-crash" },
  { kind: "output", text: `"denial": { "status": ${q(PROVE.denial.status)}, "publications": ${PROVE.denial.publications} },`, beat: "denial" },
  { kind: "output", text: `"ok": ${String(demo.prove.portable.verification.ok)}`, tone: "ok", beat: "ok" },
];

export function CrashTerminal({ theme }: Readonly<{ theme?: "light" | "dark" }> = {}) {
  return (
    <TerminalFrame
      describe="Illustration of algal demo prove. After the first crash the finished step is reused; after the second, ALGAL refuses to send the uncertain write again."
      lines={CRASH_LINES}
      title="crash-lab · Terminal"
      {...(theme === undefined ? {} : { theme })}
    />
  );
}

export const VERIFY_LINES: readonly TerminalLine[] = [
  { kind: "input", text: "algal demo export ./my-review > review.algal.json", beat: "export" },
  { kind: "input", text: "algal demo verify review.algal.json", beat: "verify" },
  { kind: "output", text: `{ "ok": ${String(demo.verify.ok)}, "generations": ${demo.verify.generations}, "status": ${q(demo.verify.status)}, … }`, tone: "ok", beat: "verify" },
  { kind: "comment", text: "checks the history is consistent; it does not prove who wrote it", beat: "limit" },
];

export function VerifyTerminal({ theme }: Readonly<{ theme?: "light" | "dark" }> = {}) {
  return (
    <TerminalFrame
      describe="Illustration of exporting the demo's history to one file and verifying it offline with algal demo verify, which reports ok true."
      lines={VERIFY_LINES}
      title="anywhere · Terminal"
      {...(theme === undefined ? {} : { theme })}
    />
  );
}

export type ReportView = "decision" | "history" | "approved";

const STEPS: Readonly<Record<ReportView, readonly (readonly [string, string, "done" | "wait" | "held"])[]>> = {
  decision: [["Evidence", "saved", "done"], ["Proposal", "saved", "done"], ["Approval", "waiting", "wait"], ["Publication", "held", "held"]],
  history: [["Evidence", "saved", "done"], ["Proposal", "saved", "done"], ["Approval", "waiting", "wait"], ["Publication", "held", "held"]],
  approved: [["Evidence", "saved", "done"], ["Proposal", "saved", "done"], ["Approval", "approved", "done"], ["Publication", "written", "done"]],
};

const MARK = { done: "✓", wait: "◷", held: "○" } as const;

/** The local report.html page `algal demo start` writes, in a neutral browser window. */
export function ApprovalPage({ theme, view = "decision" }: Readonly<{ theme?: "light" | "dark"; view?: ReportView }>) {
  const proposal = demo.proposal;
  const describe = {
    decision: "Illustration of the demo's local report page. It names the one action the program wants to take and offers approve and deny commands.",
    history: "Illustration of the report page's History tab: each saved step of the program, with its status and a short digest.",
    approved: "Illustration of the report page after approval: the approval and the local publication are both marked done.",
  }[view];
  return (
    <BrowserFrame describe={describe} url="localhost/my-review/report.html" {...(theme === undefined ? {} : { theme })}>
      <div className="al-report" data-view={view} data-film="report">
        <p className="al-report__eyebrow">ALGAL · VM workbench</p>
        <h3 className="al-report__title">A program that can wait.</h3>
        <ol className="al-report__steps" data-film="steps">
          {STEPS[view].map(([name, state, tone]) => (
            <li data-tone={tone} key={name}><span aria-hidden="true">{MARK[tone]}</span><b>{name}</b> {state}</li>
          ))}
        </ol>
        <div className="al-report__tabs" role="presentation">
          <span data-on={view !== "history" ? "" : undefined}>Proposal</span>
          <span data-on={view === "history" ? "" : undefined}>History</span>
          <span>Input evidence</span>
        </div>
        {view === "history" ? (
          <ol className="al-report__history" data-film="history">
            {demo.start.history.map(entry => (
              <li data-status={entry.status} key={entry.digest}>
                <span>Generation {entry.generation}</span>
                <b>{entry.status}</b>
                <code>{shortDigest(entry.digest)}</code>
              </li>
            ))}
          </ol>
        ) : (
          <div className="al-report__decision" data-film="decision">
            <p className="al-report__label">Your decision.</p>
            <p className="al-report__lede">The program can propose. Only your next command can authorize the exact saved action.</p>
            <dl>
              <div><dt>Allowed action</dt><dd><code>{proposal.action}</code></dd></div>
              <div><dt>Destination</dt><dd><code>{proposal.target}</code></dd></div>
            </dl>
            {view === "approved" ? (
              <p className="al-report__done" data-film="approved">Approved. Local publication written.</p>
            ) : (
              <div className="al-report__actions">
                <span className="al-report__button" data-film="approve">Copy approve command</span>
                <span className="al-report__button al-report__button--quiet" data-film="deny">Copy deny command</span>
              </div>
            )}
            <p className="al-report__note">Paste the command into your terminal, then reopen this report. Copying a command does not execute it.</p>
          </div>
        )}
      </div>
    </BrowserFrame>
  );
}

export const INSTALL_LINES: readonly TerminalLine[] = [
  { kind: "input", text: "curl -fsSL https://algal.computer/install.sh | sh", beat: "install" },
  { kind: "comment", text: "checks the archive's SHA-256, then installs ~/.local/bin/algal", beat: "install" },
  { kind: "input", text: "algal demo start ./my-review", beat: "demo" },
  { kind: "comment", text: "scripted decisions; no model account needed", beat: "demo" },
];

export function InstallTerminal({ theme }: Readonly<{ theme?: "light" | "dark" }> = {}) {
  return (
    <TerminalFrame
      describe="Illustration of installing ALGAL with one command and starting the built-in demo."
      lines={INSTALL_LINES}
      title="Terminal"
      {...(theme === undefined ? {} : { theme })}
    />
  );
}

/** What works today and what is not built yet, from site/copy.ts ADOPTION_BOUNDARY. */
export const STATUS_ROWS: readonly (readonly [string, "yes" | "no", string])[] = [
  ["Wait for approval, then act", "yes", "one exact action per decision"],
  ["Resume after a crash", "yes", "finished steps are not redone"],
  ["Replay and check a run offline", "yes", "consistency, not identity"],
  ["Signed, notarized packages", "no", "unsigned prerelease builds"],
  ["Tool permissions and OS isolation", "no", "your host app decides"],
  ["Multi-tenant service", "no", "not built yet"],
];

export function StatusCard() {
  return (
    <div aria-label="Illustration of a status card: what ALGAL does today and what is not built yet." className="al-status" role="img">
      <p className="al-status__title">ALGAL today</p>
      <ul>
        {STATUS_ROWS.map(([name, state, note]) => (
          <li data-state={state} key={name}>
            <span aria-hidden="true">{state === "yes" ? "✓" : "–"}</span>
            <b>{name}</b>
            <small>{note}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Every mockup a beat can name, keyed by the id its LaunchVisual uses. */
export const LAUNCH_MOCKUPS = {
  "first-run": () => <FirstRunTerminal />,
  "approval-page": (state: Readonly<Record<string, string>>) => <ApprovalPage view={(state.view ?? "decision") as ReportView} />,
  crash: () => <CrashTerminal />,
  verify: () => <VerifyTerminal />,
  install: () => <InstallTerminal />,
  status: () => <StatusCard />,
} as const;

export type LaunchMockupId = keyof typeof LAUNCH_MOCKUPS;
