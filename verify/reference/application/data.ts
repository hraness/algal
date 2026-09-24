/** Finite fixture materialization is a declared trust seam shared by adapters.
 * No lifecycle, authority, outbox or error decisions belong here. */
import { hashJson, type Bit, type Fixtures, type ObjectValue } from "./schema";
export const appName = (app: Bit) => `history-${app}`;
export const operation = (app: Bit, key: number) => hashJson({ application: appName(app), operation: key });
export const effectText = (identity: string) => `${identity}\n`;
export function intentSpecs(choice: "none" | "deliveries" | "writer", f: Fixtures): ObjectValue[] {
    if (choice === "none")
        return [];
    if (choice === "writer")
        return [{ kind: "start-episode", entrypoint: "run", input: f.input }];
    return [0, 1].map(n => ({ kind: "deliver", route: `route-${n}`, message: f.messages[n]! }));
}
