import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function findPluginRoot(moduleUrl: string): string {
  let current = dirname(fileURLToPath(moduleUrl));
  while (true) {
    if (existsSync(join(current, "plugin.json")) && existsSync(join(current, "skills"))) return current;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new Error(`Unable to locate the BeeTrust plugin package root from ${moduleUrl}.`);
}
