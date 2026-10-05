// The launch film's record. The rendered files live in site/launch/film/ and
// are copied to /launch/ by build.ts, with the 1:1 and 9:16 social cuts.
// launchFilm() returns null if the files are missing, and the post then shows
// no player.
import { existsSync } from "node:fs";
import { join } from "node:path";

import type { ArticleVideoRecord } from "@hraness/design-kit";

export const FILM_DIR = join(import.meta.dir, "film");
export const FILM_PATH = "/launch/";

/** Files the film needs before the post embeds it. */
export const FILM_FILES = ["launch.mp4", "launch-poster.jpg", "launch.vtt"] as const;

export function launchFilm(dir: string = FILM_DIR): ArticleVideoRecord | null {
  if (!FILM_FILES.every(file => existsSync(join(dir, file)))) return null;
  return {
    name: "Introducing ALGAL",
    description: "A 33-second captioned film about ALGAL: an agent can act before you can stop it; an ALGAL program stops before it acts and waits for approval, survives crashes without redoing finished steps or resending a write, its whole run is checked on another machine, and it ends with asking your agent to install ALGAL.",
    sources: [
      { src: `${FILM_PATH}launch.webm`, type: "video/webm" },
      { src: `${FILM_PATH}launch.mp4`, type: "video/mp4" },
    ],
    poster: `${FILM_PATH}launch-poster.jpg`,
    captions: `${FILM_PATH}launch.vtt`,
    width: 1920,
    height: 1080,
    duration: FILM_DURATION,
    uploadDate: "2026-10-04",
  };
}

/** video/story/build/timeline.json duration (32.9 s), rounded up. */
export const FILM_DURATION = "PT33S" as const;
