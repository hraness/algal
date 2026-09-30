import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { assertLaunchKit, LAUNCH_LIMITS } from "@hraness/design-kit/launch";

import { launchBeats, launchKitOptions, LAUNCH_POST_URL, socialKit } from "./launch/beats";
import { demoFixture, launchFacts, statusFromTag } from "./launch/facts";
import { launchFilm } from "./launch/film";
import { CRASH_LINES, FIRST_RUN_LINES, LAUNCH_MOCKUPS, VERIFY_LINES } from "./launch/mockups";
import { homeTourHtml, launchBeatsHtml } from "./launch/render";
import { renderSocialKitMarkdown } from "./launch/social-kit-markdown";

const root = join(import.meta.dir, "..");
const read = (path: string) => readFile(join(root, path), "utf8");

describe("launch facts match their records", () => {
  test("the status and version come from the release record", async () => {
    const { tag } = JSON.parse(await read("site/published-release.json")) as { tag: string };
    expect(launchFacts.version.value).toBe(tag);
    expect(launchFacts.status.value).toBe(statusFromTag(tag));
    expect(statusFromTag("v0.2.0-vm.11")).toBe("Preview");
    expect(statusFromTag("v1.2.3")).toBe("Latest release: v1.2.3");
  });

  test("the platforms match the native release table", async () => {
    const table = await read("docs/native-release.md");
    for (const target of ["aarch64-apple-darwin", "x86_64-unknown-linux-gnu", "aarch64-unknown-linux-gnu"]) {
      expect(table).toContain(`\`${target}\``);
    }
    expect(launchFacts.platforms.value).toBe("macOS on Apple silicon, and Linux on x86_64 and Arm");
  });

  test("the demo fixture holds the crash outcomes demo.rs requires", async () => {
    const source = await read("crates/algal/src/demo.rs");
    expect(source).toContain("prefixPublications");
    expect(source).toContain("pendingWritePublications");
    expect(Object.keys(demoFixture.prove).filter(key => key.endsWith("Crash"))).toEqual(["readCrash", "writeCrash"]);
    expect(launchFacts.crashCount.value).toBe("twice");
    expect(demoFixture.prove.readCrash.prefixPublications).toBe(1);
    expect(demoFixture.prove.writeCrash.pendingWritePublications).toBe(1);
    expect(demoFixture.prove.denial.publications).toBe(0);
    expect(demoFixture.prove.approval.publications).toBe(1);
    expect(demoFixture.verify.ok).toBe(true);
    expect(demoFixture.start.status).toBe("waiting");
  });

  test("the license fact matches LICENSE", async () => {
    expect(await read("LICENSE")).toContain("MIT License");
    expect(launchFacts.license.value).toBe("MIT");
  });
});

describe("launch beats and social kit", () => {
  test("the beats pass the design-kit checks", () => {
    expect(launchBeats.length).toBeGreaterThanOrEqual(LAUNCH_LIMITS.beatsMin);
    expect(launchBeats.length).toBeLessThanOrEqual(LAUNCH_LIMITS.beatsMax);
    expect(() => assertLaunchKit(launchBeats, socialKit, launchKitOptions)).not.toThrow();
  });

  test("every beat names a mockup or diagram that exists", async () => {
    for (const beat of launchBeats) {
      if (beat.visual.kind === "mockup") expect(Object.keys(LAUNCH_MOCKUPS)).toContain(beat.visual.id);
      if (beat.visual.kind === "diagram") expect(beat.visual.src).toMatch(/^\/diagrams\/[a-z-]+\.svg$/u);
      expect(beat.alt.toLowerCase()).toMatch(/^(illustration|diagram) of /u);
    }
  });

  test("only the last post of each thread links, to the launch post", () => {
    for (const thread of [socialKit.x, socialKit.bluesky, socialKit.threads]) {
      expect(thread.slice(0, -1).some(post => post.includes("https://"))).toBe(false);
      expect(thread.at(-1)).toContain(LAUNCH_POST_URL);
      expect(thread.at(-1)).toContain(launchFacts.status.value);
    }
  });

  test("kb/launch/social-kit.md is generated from the beats", async () => {
    expect(await read("kb/launch/social-kit.md")).toBe(renderSocialKitMarkdown());
  });
});

describe("launch mockups", () => {
  test("terminal lines carry the fixture's values", () => {
    const text = (lines: readonly { text: string }[]) => lines.map(line => line.text).join("\n");
    expect(text(FIRST_RUN_LINES)).toContain(`"status": "${demoFixture.start.status}"`);
    expect(text(CRASH_LINES)).toContain(`"pendingWritePublications": ${demoFixture.prove.writeCrash.pendingWritePublications}`);
    expect(text(VERIFY_LINES)).toContain(`"ok": ${String(demoFixture.verify.ok)}`);
  });

  test("the beats and the homepage tour render with one anchor per beat", () => {
    const html = launchBeatsHtml();
    for (const beat of launchBeats) expect(html).toContain(`id="beat-${beat.id}"`);
    const tour = homeTourHtml();
    expect(tour.match(/role="tabpanel"/gu)?.length).toBe(5);
    expect(tour).toContain("Illustrations");
  });

  test("the post embeds no film until its files exist", () => {
    expect(launchFilm(join(root, "site/launch/no-such-dir"))).toBeNull();
  });
});
