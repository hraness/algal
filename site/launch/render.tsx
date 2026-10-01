// Static HTML for the launch mockups: the "Introducing ALGAL" beats and the
// homepage first-run tour. The site is a static build, so these render once
// with renderToStaticMarkup; site/client.ts adds the tour's tab switching.
import { ArticleVideo, LaunchBeats } from "@hraness/design-kit/react/server";
import type { LaunchBeat } from "@hraness/design-kit/launch";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import refineManifest from "../../examples/refine.algal.json";
import { parseOrganismManifest } from "../../src/contract";
import { createProgramDiagram, layoutDiagram } from "../../src/diagram";
import { launchBeats } from "./beats";
import { launchFacts } from "./facts";
import { launchFilm } from "./film";
import { ApprovalPage, CrashTerminal, FirstRunTerminal, LAUNCH_MOCKUPS, VerifyTerminal, type LaunchMockupId } from "./mockups";

function isMockupId(id: string): id is LaunchMockupId {
  return Object.hasOwn(LAUNCH_MOCKUPS, id);
}

// Match emitDiagram in site/build.ts so lazy diagrams reserve their final size.
const diagramSizes: Readonly<Record<string, Readonly<{ width: number; height: number }>>> = {
  "/diagrams/refine.svg": layoutDiagram(createProgramDiagram(parseOrganismManifest(refineManifest)), { compact: true, header: false }),
};

function renderVisual(beat: LaunchBeat): ReactNode {
  const { visual } = beat;
  switch (visual.kind) {
    case "mockup": {
      if (!isMockupId(visual.id)) throw new Error(`Beat ${beat.id} names an unknown mockup ${visual.id}.`);
      return LAUNCH_MOCKUPS[visual.id](visual.state);
    }
    case "diagram": {
      const size = diagramSizes[visual.src];
      if (size === undefined) throw new Error(`Beat ${beat.id} names a diagram without dimensions: ${visual.src}.`);
      return <img alt="" className="al-beat-diagram" decoding="async" height={size.height} loading="lazy" src={visual.src} width={size.width} />;
    }
    case "clip":
      throw new Error(`Beat ${beat.id} names a film clip; the ALGAL post uses mockups and diagrams.`);
  }
}

/** The beats section of the launch post, one anchored section per beat. */
export function launchBeatsHtml(): string {
  return renderToStaticMarkup(<LaunchBeats beats={launchBeats} detailLabel="Read more" renderVisual={renderVisual} />);
}

export const TOUR_STEPS = [
  { id: "start", label: "Start", note: "The program stops with status waiting. Nothing has been written yet.", view: () => <FirstRunTerminal /> },
  { id: "decide", label: "Decide", note: "The local report names the one action and where it goes. You copy approve or deny.", view: () => <ApprovalPage view="decision" /> },
  { id: "history", label: "History", note: "Every saved step, with its status and a short fingerprint.", view: () => <ApprovalPage view="history" /> },
  { id: "crash", label: "Crash", note: "Killed twice on purpose: finished steps are reused, and an uncertain write is not resent.", view: () => <CrashTerminal /> },
  { id: "verify", label: "Verify", note: "Export the run to one file and check it on any machine.", view: () => <VerifyTerminal /> },
] as const;

/**
 * The homepage tour: a tab list over the same mockups the launch post uses.
 * Without JavaScript only the first panel shows and the tab list stays hidden.
 */
export function homeTourHtml(): string {
  return renderToStaticMarkup(
    <div className="al-tour" data-al-tour="">
      <div aria-label="First run, step by step" className="al-tour__tabs" hidden role="tablist">
        {TOUR_STEPS.map((step, index) => (
          <button aria-controls={`al-tour-${step.id}`} aria-selected={index === 0} className="al-tour__tab" id={`al-tour-tab-${step.id}`} key={step.id} role="tab" tabIndex={index === 0 ? 0 : -1} type="button">
            <span aria-hidden="true" className="al-tour__index">{index + 1}</span>{step.label}
          </button>
        ))}
      </div>
      {TOUR_STEPS.map((step, index) => (
        <div aria-labelledby={`al-tour-tab-${step.id}`} className="al-tour__panel" hidden={index === 0 ? undefined : true} id={`al-tour-${step.id}`} key={step.id} role="tabpanel">
          <p className="al-tour__note">{step.note}</p>
          {step.view()}
        </div>
      ))}
      <p className="al-tour__caption">Illustrations drawn from a recorded run of <code>algal demo</code>. Output is trimmed where marked with an ellipsis.</p>
    </div>,
  );
}

/** The launch film figure, or an empty string while the film is not rendered. */
export function launchFilmHtml(): string {
  const film = launchFilm();
  if (film === null) return "";
  return renderToStaticMarkup(
    <ArticleVideo caption="The launch film: the demo's first run, a decision, two crashes, and an offline check. Illustrations, with captions." video={film} width="wide" />,
  );
}

/** The post's status line, from the release record and the facts module. */
export function launchStatusHtml(): string {
  return renderToStaticMarkup(
    <p className="al-launch-status">
      Status: <strong>{launchFacts.status.value}</strong> ({launchFacts.version.value}). Free and open source under the {launchFacts.license.value} license.
    </p>,
  );
}
