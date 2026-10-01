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
    description: "ALGAL's built-in demo: a program stops for approval, survives two crashes without resending a write, and its history is checked offline.",
    sources: [
      { src: `${FILM_PATH}launch.webm`, type: "video/webm" },
      { src: `${FILM_PATH}launch.mp4`, type: "video/mp4" },
    ],
    poster: `${FILM_PATH}launch-poster.jpg`,
    captions: `${FILM_PATH}launch.vtt`,
    width: 1920,
    height: 1080,
    duration: FILM_DURATION,
    uploadDate: "2026-10-01",
  };
}

/** video/out/beats.json duration (37.7 s), rounded up. */
export const FILM_DURATION = "PT38S" as const;
