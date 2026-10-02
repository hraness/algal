import { lstatSync } from "node:fs";
import { isAbsolute, join } from "node:path";

const args = new Set(process.argv.slice(2));
const labPath = process.env.OH_MEMORY_LAB ?? null;
const present = (name: string): boolean => typeof process.env[name] === "string" && process.env[name]!.length > 0;
const regular = (path: string | null): boolean => {
  if (path === null) return false;
  try {
    const stat = lstatSync(path);
    return stat.isFile() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
};
const lab = labPath === null ? null : {
  configured: true,
  absolute: isAbsolute(labPath),
  profile: regular(join(labPath, "profile.json")),
  budget: regular(join(labPath, "budget.json")),
};
const result = {
  protocol: "algal.inference-development-status.v1",
  credentials: {
    xai: { env: "XAI_API_KEY", present: present("XAI_API_KEY") },
    gemini: {
      env: ["GEMINI_API_KEY", "VERTEX_API_KEY"],
      present: present("GEMINI_API_KEY") || present("VERTEX_API_KEY"),
    },
  },
  lab: lab ?? { configured: false, absolute: false, profile: false, budget: false },
  requestMade: false,
};
console.log(JSON.stringify(result, null, 2));

if (args.has("--require-api") && (!result.credentials.xai.present || !result.credentials.gemini.present
  || !result.lab.configured || !result.lab.absolute || !result.lab.profile || !result.lab.budget)) process.exitCode = 1;
