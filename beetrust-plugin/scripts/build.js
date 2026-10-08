import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const checkoutCore = resolve("..", "apps", "web", "src");
const outputOption = process.argv.indexOf("--outDir");
const outputDirectory = outputOption >= 0 ? process.argv[outputOption + 1] : "dist";
if (!outputDirectory) throw new Error("--outDir requires a directory.");
if (!existsSync(checkoutCore)) {
  if (resolve(outputDirectory) !== resolve("dist")) {
    console.error("A clean plugin build requires the shared TypeScript source from the repository checkout.");
    process.exitCode = 1;
  }
  const requiredBuildFiles = [
    "dist/apps/web/src/public-api.js",
    "dist/beetrust-plugin/src/index.js",
    "dist/beetrust-plugin/src/mcp-server.js"
  ];
  const missing = requiredBuildFiles.filter((path) => !existsSync(path));
  if (missing.length > 0) {
    console.error(`BeeTrust shared source is unavailable and the package build is incomplete: ${missing.join(", ")}`);
    process.exitCode = 1;
  } else {
    console.log("BeeTrust plugin runtime build is present; using its precompiled shared core.");
  }
} else {
  const compiler = resolve("node_modules", "typescript", "bin", "tsc");
  const result = spawnSync(process.execPath, [compiler, "-p", "tsconfig.json", "--outDir", resolve(outputDirectory)], { stdio: "inherit" });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
