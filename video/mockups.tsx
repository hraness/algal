/**
 * The film's product surface: the same mockup components the launch post and
 * the homepage tour render (site/launch/mockups.tsx), laid out as one desk the
 * camera moves across. Every value in them comes from the captured demo run.
 *
 * Illustration: drawn from a recorded run of `algal demo`, trimmed where marked.
 */
import { ApprovalPage, CrashTerminal, FirstRunTerminal, VerifyTerminal } from "../site/launch/mockups.tsx";

/** A desk of the four demo surfaces. film.json steps point at the data-film names. */
export function ProductMockup() {
  return (
    <div className="al-desk" role="img" aria-label="Illustration of ALGAL's demo: a terminal, the report page, a crash run and an offline check">
      <div className="al-desk__cell" data-film="start"><FirstRunTerminal theme="dark" /></div>
      <div className="al-desk__cell" data-film="page"><ApprovalPage theme="dark" view="decision" /></div>
      <div className="al-desk__cell" data-film="crash"><CrashTerminal theme="dark" /></div>
      <div className="al-desk__cell" data-film="verify"><VerifyTerminal theme="dark" /></div>
    </div>
  );
}

/** Cold-open cards: made-up lines from an agent that acts without asking. */
const AGENT_LOG = [
  ["email", "Sent 40 replies to the support queue"],
  ["deploy", "Pushed a config change to production"],
  ["files", "Deleted 12 drafts it thought were stale"],
  ["billing", "Issued a refund on ticket 881"],
  ["repo", "Merged its own pull request"],
  ["posts", "Published the announcement early"],
] as const;

export function OpenCard({ index }: { index: number }) {
  const [tool, line] = AGENT_LOG[index % AGENT_LOG.length]!;
  return (
    <div className="fm-card">
      <span className="fm-avatar" aria-hidden="true">{tool[0]!.toUpperCase()}</span>
      <div>
        <b>agent · {tool}</b>
        <p>{line}</p>
      </div>
    </div>
  );
}
