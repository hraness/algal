// The one typed place for every number, version, and status in the
// "Introducing ALGAL" post, its social kit, the homepage mockup, and the
// launch film. Beats use {placeholders}; the design kit rejects a beat that
// types a digit. Each fact names the record it comes from.
import type { LaunchFacts, LaunchStatus } from "@hraness/design-kit/launch";

import publishedRelease from "../published-release.json";
import demo from "./demo-fixture.json";

/** The release record the site already renders. */
export const RELEASE_TAG: string = publishedRelease.tag;

/**
 * STYLE.md status label from the release record. A tag with a prerelease
 * suffix (v0.2.0-vm.11) is a preview; a plain semver tag is a release.
 */
export function statusFromTag(tag: string): LaunchStatus {
  const match = /^v(\d+)\.(\d+)\.(\d+)(-[0-9A-Za-z.-]+)?$/u.exec(tag);
  if (match === null) throw new Error(`published-release.json has an unexpected tag ${JSON.stringify(tag)}.`);
  if (match[4] !== undefined) return "Preview";
  return `Latest release: v${Number(match[1])}.${Number(match[2])}.${Number(match[3])}`;
}

export const LAUNCH_STATUS: LaunchStatus = statusFromTag(RELEASE_TAG);

const FIXTURE = "site/launch/demo-fixture.json, captured from algal 0.2.0";

export const launchFacts = {
  status: { value: LAUNCH_STATUS, source: `site/published-release.json tag ${RELEASE_TAG}; a prerelease tag maps to the STYLE.md label Preview` },
  version: { value: RELEASE_TAG, source: "site/published-release.json" },
  license: { value: "MIT", source: "LICENSE and the home page meta line" },
  platforms: { value: "macOS on Apple silicon, and Linux on x86_64 and Arm", source: "docs/native-release.md platform table; release assets for v0.2.0-vm.11" },
  crashCount: { value: "twice", source: "`algal demo prove --help`: approval, denial, detached verification, and two owned crashes" },
  deniedPublications: { value: String(demo.prove.denial.publications), source: `${FIXTURE}: prove.denial.publications` },
  approvedPublications: { value: String(demo.prove.approval.publications), source: `${FIXTURE}: prove.approval.publications` },
  finishedStepDeliveries: { value: String(demo.prove.readCrash.prefixPublications), source: `${FIXTURE}: prove.readCrash.prefixPublications (crashes/demo.rs requires 1 before and after recovery)` },
  inFlightWriteDeliveries: { value: String(demo.prove.writeCrash.pendingWritePublications), source: `${FIXTURE}: prove.writeCrash.pendingWritePublications (recovery is refused and the count stays at 1)` },
} as const satisfies LaunchFacts;

export type LaunchFactKey = keyof typeof launchFacts;

/** The captured demo run the mockups draw from. */
export const demoFixture = demo;
