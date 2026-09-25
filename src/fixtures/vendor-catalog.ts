// Test support for vendoring: a scratch copy of the repository's catalog page
// and task-planning programs, a loopback server for that copy, and a consumer
// program that imports a vendored entry. The package does not ship this file.
import { cp, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export const REPOSITORY = resolve(import.meta.dir, "../..");
export const ENTRY = "task-planning/score_task.algal";
export const CLAMP = "task-planning/lib/clamp.algal";

export async function temporary<T>(prefix: string, run: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  try { return await run(dir); } finally { await rm(dir, { recursive: true, force: true }); }
}

/** Copy `docs/library.md` and the task-planning project into `<dir>/catalog`,
 * keeping the page's relative links intact; returns the page's path. */
export async function scratchCatalog(dir: string): Promise<string> {
  const root = join(dir, "catalog");
  await mkdir(join(root, "docs"), { recursive: true });
  await cp(join(REPOSITORY, "docs/library.md"), join(root, "docs/library.md"));
  await cp(join(REPOSITORY, "examples/source/projects/task-planning"), join(root, "examples/source/projects/task-planning"), { recursive: true });
  return join(root, "docs/library.md");
}

export type CatalogRoute = (request: Request, base: string) => Response | Promise<Response>;
export type CatalogServer = { readonly base: string; readonly requests: string[]; readonly stop: () => void };
/** Serve a scratch catalog over loopback http, logging every request path.
 * `routes` replace the file behind a path, for failure cases. */
export function serveCatalog(root: string, routes: Record<string, CatalogRoute> = {}): CatalogServer {
  const requests: string[] = [];
  let base = "";
  const server = Bun.serve({
    hostname: "127.0.0.1", port: 0,
    async fetch(request): Promise<Response> {
      const path = new URL(request.url).pathname;
      requests.push(path);
      const route = routes[path];
      if (route !== undefined) return route(request, base);
      const text = await readFile(join(root, ...path.split("/").filter(Boolean)), "utf8").catch(() => undefined);
      return text === undefined ? new Response("missing", { status: 404 }) : new Response(text);
    },
  });
  base = `http://127.0.0.1:${server.port}`;
  return { base, requests, stop: () => { void server.stop(true); } };
}

/** A project program that calls the vendored scoring entry. */
export const CONSUMER = `import score_task from "./vendor/algal/task-planning/score_task.algal"

program main(task: json, weights: json) -> json {
  budget { max_agent_calls: 0, max_depth: 2 }
  return call score_task using { task: task, weights: weights }
}
`;
