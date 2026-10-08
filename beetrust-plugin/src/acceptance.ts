import { existsSync } from "node:fs";
import { join } from "node:path";
import { runAcceptance as runSharedAcceptance } from "../../apps/web/src/acceptance.js";
import type { AcceptanceCheck, AcceptanceReport } from "../../apps/web/src/acceptance.js";
import { findPluginRoot } from "./package-paths.js";

export type { AcceptanceCheck, AcceptanceReport };

export async function runAcceptance(): Promise<AcceptanceReport> {
  const packageRoot = findPluginRoot(import.meta.url);
  return runSharedAcceptance({
    packageRoot,
    publicMaterialsRoot: packageRoot,
    resolvePackagePath: (relativePath) => {
      const sourcePath = join(packageRoot, relativePath);
      if (existsSync(sourcePath)) return sourcePath;
      const sharedSourcePrefix = "../apps/web/src/";
      if (relativePath.startsWith(sharedSourcePrefix)) {
        return join(packageRoot, "dist", "apps", "web", "src", relativePath.slice(sharedSourcePrefix.length).replace(/\.ts$/, ".js"));
      }
      return sourcePath;
    }
  });
}
