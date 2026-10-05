/**
 * Help screens for the Bun `algal` CLI: the short start screen, grouped
 * `--help`, `help advanced`, and per-command help cut from the full reference
 * (`algal help all`). Public copy: plain words, internal terms glossed.
 */

type Row = readonly [command: string, summary: string];
type Group = { readonly title: string; readonly rows: readonly Row[] };

/** Registry description (portfolio messaging record, product `algal`). */
export const DESCRIPTION =
  "ALGAL is a programming language and VM for AI agent programs that wait for approval and leave receipts you can replay.";

const RECEIPT_GLOSS = "A receipt is the saved record of every step a run took.";

const START: readonly Row[] = [
  ["algal examples", "List the bundled example programs"],
  ["algal compile <program.algal>", "Compile a program to a manifest"],
  ["algal check <program>", "Check a program without running it"],
  ["algal run <manifest.json>", "Run a program and print its receipt"],
  ["algal verify <receipt.json>", "Replay a run and confirm it matches"],
];

const GROUPS: readonly Group[] = [
  {
    title: "Write and inspect",
    rows: [
      ["fmt <program.algal>", "Format source files"],
      ["diagram <program>", "Draw a program as SVG, Mermaid, or JSON"],
      ["explain <manifest.json>", "Print a program's inputs, outputs, and checks"],
      ["inspect <receipt.json>", "Summarize a run"],
      ["diagnose <receipt.json>", "Point a failed run back to its source line"],
      ["diff <receipt-a> <receipt-b>", "Compare two runs"],
      ["runs", "List saved runs"],
    ],
  },
  {
    title: "Wait and continue",
    rows: [
      ["resume <receipt.json>", "Continue a run that is waiting"],
      ["replay <receipt> --with <m>", "Rerun saved work against a changed program"],
      ["process <create|tick|inspect>", "Keep a program running across restarts"],
      ["mailbox <create|send|receive>", "Wake a waiting program with a message"],
      ["observe", "Show recent activity in the store"],
    ],
  },
  {
    title: "Store and share",
    rows: [
      ["store <put|get|has>", "Save and read JSON values by digest"],
      ["pack <manifest.json>", "Bundle a program with everything it imports"],
      ["unpack <bundle.json>", "Install a bundle, checking every digest"],
      ["call <bundle.json>", "Run a bundle and print a short result"],
      ["manifests", "List saved programs"],
    ],
  },
  {
    title: "Setup",
    rows: [
      ["auth clef --status", "Check environment-only Cloudflare credentials"],
      ["doctor", "Check that ALGAL is ready"],
      ["update", "Show this Bun runtime's manual update workflow"],
    ],
  },
];

const ADVANCED: readonly Row[] = [
  ["foundry <config.json>", "Generate candidate programs, score them, keep the best"],
  ["bench <config.json>", "Compare several setups on one workload"],
  ["experiment <config.json>", "Run a repeatable experiment and report it"],
  ["library compare <name> <rev>", "Compare a library revision on unseen cases"],
  ["suite", "Run and verify every bundled example"],
  ["ordering <scenario.json>", "Explore message and dispatch orderings"],
  ["application <drain|lineage>", "Durable application tools"],
  ["job <prepare|run|inspect>", "Run a coding job in a clean checkout"],
  ["repair <start|tick|verify>", "Check and apply a coding job's patch"],
  ["shepherd <start|tick|watch>", "Watch a GitHub pull request until it settles"],
  ["dependencies <program.algal>", "List a program's imports and their digests"],
  ["lock <program.algal>", "Pin a program's imports to exact digests"],
  ["vendor <catalog> --entry <p>", "Copy a program from a catalog into this repo"],
  ["envelope <program>", "Print what a program is allowed to do"],
  ["index", "Build the local search index over saved programs"],
  ["search <query>", "Search saved programs by meaning and words"],
  ["db <build|status|query>", "Query the program index with SQL-like records"],
  ["slot <get|set> <name>", "Read or seed one durable value"],
  ["slots", "List durable values"],
  ["manifest <sha256:...>", "Print a saved program"],
  ["digest <manifest.json>", "Print a program's digest"],
  ["tool-def <manifest.json>", "Print a tool definition for a program"],
  ["tail", "Follow new activity in the store"],
];

const MAX_COLUMNS = 80;

function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(" ")) {
    if (current !== "" && current.length + 1 + word.length > width) {
      lines.push(current);
      current = word;
    } else {
      current = current === "" ? word : `${current} ${word}`;
    }
  }
  if (current !== "") lines.push(current);
  return lines;
}

function row([command, summary]: Row, width: number): string {
  const label = `  ${command}`;
  return label.length < width ? `${label.padEnd(width)}${summary}` : `${label}\n${" ".repeat(width)}${summary}`;
}

/** Bare `algal`: what it is and the first commands to run, in at most 25 lines. */
export function startHelp(version: string): string {
  const lines = [
    ...wrap(DESCRIPTION, MAX_COLUMNS),
    "",
    "Start here",
    ...START.map((entry) => row(entry, 34)),
    "",
    RECEIPT_GLOSS,
    "All commands: algal --help · Command help: algal <command> --help",
    `algal ${version}`,
  ];
  return `${lines.join("\n")}\n`;
}

/** `algal --help`: grouped everyday commands, at most 60 lines. */
export function rootHelp(): string {
  const lines = ["Usage: algal <command> [options]", "", ...wrap(DESCRIPTION, MAX_COLUMNS), "", "Start here"];
  lines.push(...START.map(([command, summary]) => row([command.replace(/^algal /u, ""), summary], 34)));
  for (const group of GROUPS) {
    lines.push("", group.title, ...group.rows.map((entry) => row(entry, 34)));
  }
  lines.push(
    "",
    "Options",
    row(["-h, --help", "Show help. Also: algal <command> --help"], 34),
    row(["--version", "Print the version"], 34),
    row(["--dir <path>", "Store folder (default: .algal)"], 34),
    row(["--diagnostic-format json|text", "Error format for source files"], 34),
    "",
    RECEIPT_GLOSS,
    "More commands: algal help advanced · Full reference: algal help all",
  );
  return `${lines.join("\n")}\n`;
}

/** `algal help advanced`: research, evaluation, and maintainer commands. */
export function advancedHelp(): string {
  const lines = [
    "Usage: algal <command> [options]",
    "",
    "Advanced commands for experiments, coding jobs, and program libraries.",
    "",
    ...ADVANCED.map((entry) => row(entry, 34)),
    "",
    "Command help: algal <command> --help · Full reference: algal help all",
  ];
  return `${lines.join("\n")}\n`;
}

/** Every top-level command word the help screens name. */
export function commandWords(): readonly string[] {
  const words = new Set<string>(["help", "version", "examples", "example"]);
  for (const [command] of [...START, ...GROUPS.flatMap((group) => group.rows), ...ADVANCED]) {
    const word = command.replace(/^algal /u, "").split(" ")[0]!;
    words.add(word);
  }
  return [...words].sort();
}

/**
 * Help for one command: its entries from the full reference, each synopsis
 * line with its continuation lines. Undefined when the reference has none.
 */
export function commandHelp(reference: string, words: readonly string[]): string | undefined {
  const [first, second] = words;
  if (first === undefined || !/^[a-z][a-z-]*$/u.test(first)) return undefined;
  const lines = reference.split("\n");
  const blocks: string[][] = [];
  let current: string[] | undefined;
  for (const line of lines) {
    if (line.startsWith("  algal ")) {
      const tokens = line.trim().split(/\s+/u);
      const matches = tokens[1] === first || tokens[1]?.startsWith(`${first}|`) === true
        || (first === "version" && tokens[1] === "--version");
      current = matches ? [line] : undefined;
      if (current !== undefined) blocks.push(current);
    } else if (current !== undefined && /^ {4,}\S/u.test(line)) {
      current.push(line);
    } else {
      current = undefined;
    }
  }
  if (blocks.length === 0) return undefined;
  // `algal process create --help` narrows to the matching action when one exists.
  const narrowed = second !== undefined && /^[a-z][a-z-]*$/u.test(second)
    ? blocks.filter((block) => {
      const action = block[0]!.trim().split(/\s+/u)[2] ?? "";
      return action === second || action.split("|").includes(second);
    })
    : [];
  const chosen = narrowed.length > 0 ? narrowed : blocks;
  const body = chosen.map((block) => block.map((line) => line.replace(/^ {2}/u, "")).join("\n"));
  return `Usage:\n${body.map((entry) => entry.split("\n").map((line) => `  ${line}`).join("\n")).join("\n")}\n\n${RECEIPT_GLOSS}\nAll commands: algal --help\n`;
}
