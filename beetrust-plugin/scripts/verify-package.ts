import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sharedSourceRoot = resolve(packageRoot, "..", "apps", "web", "src");
const sharedBuildRoot = join(packageRoot, "dist", "apps", "web", "src");
const sharedSourceAvailable = existsSync(sharedSourceRoot);
const sharedRoot = sharedSourceAvailable ? sharedSourceRoot : sharedBuildRoot;
const sharedExtension = sharedSourceAvailable ? ".ts" : ".js";
const skillNames = [
  "orchestration-hub",
  "fingerprint-evidence",
  "custody-ledger",
  "mpi-market-access",
  "customs-clearance",
  "trade-risk-adversary",
  "evidence-monitor"
];

const failures: string[] = [];

function requirePath(relativePath: string): void {
  if (!existsSync(join(packageRoot, relativePath))) failures.push(`missing:${relativePath}`);
}

requirePath("plugin.json");
requirePath("submission-metadata.json");
requirePath("assets/beetrust-entry-cover.png");
requirePath("assets/beetrust-plugin-icon.png");
requirePath("docs/support.md");
requirePath("docs/privacy-policy.md");
requirePath("docs/terms-of-use.md");
requirePath("package.json");
requirePath("src/index.ts");
requirePath("src/mcp-server.ts");
requirePath("src/public-api.ts");
requirePath("dist/beetrust-plugin/src/mcp-server.js");
requirePath("dist/beetrust-plugin/src/public-api.js");
requirePath("dist/apps/web/src/public-api.js");
requirePath("tests/README.md");
requirePath("tests/public-submission-test-cases.json");

const pluginManifestPath = join(packageRoot, "plugin.json");
if (existsSync(pluginManifestPath)) {
  try {
    const manifest = JSON.parse(readFileSync(pluginManifestPath, "utf8")) as {
      name?: string;
      version?: string;
      description?: string;
    };
    if (manifest.name !== "beetrust-plugin") failures.push("plugin-manifest:name");
    if (!manifest.version) failures.push("plugin-manifest:version");
    if (!manifest.description) failures.push("plugin-manifest:description");
  } catch {
    failures.push("plugin-manifest:invalid-json");
  }
}

const submissionMetadataPath = join(packageRoot, "submission-metadata.json");
const testCasesPath = join(packageRoot, "tests", "public-submission-test-cases.json");
if (existsSync(submissionMetadataPath)) {
  try {
    const metadata = JSON.parse(readFileSync(submissionMetadataPath, "utf8")) as {
      pluginName?: string;
      shortDescription?: string;
      longDescription?: string;
      projectUrl?: string;
      supportUrl?: string;
      privacyPolicyUrl?: string;
      termsUrl?: string;
      availability?: { countries?: string[] };
    };
    for (const field of ["pluginName", "shortDescription", "longDescription", "projectUrl", "supportUrl", "privacyPolicyUrl", "termsUrl"] as const) {
      if (!metadata[field]) failures.push(`submission-metadata:${field}`);
    }
    if ((metadata.availability?.countries?.length ?? 0) < 1) failures.push("submission-metadata:availability");
  } catch {
    failures.push("submission-metadata:invalid-json");
  }
}

if (existsSync(testCasesPath)) {
  try {
    const testCases = JSON.parse(readFileSync(testCasesPath, "utf8")) as {
      positiveCases?: Array<unknown>;
      negativeCases?: Array<unknown>;
    };
    if ((testCases.positiveCases?.length ?? 0) < 5) failures.push("submission-tests:positive-cases");
    if ((testCases.negativeCases?.length ?? 0) < 3) failures.push("submission-tests:negative-cases");
  } catch {
    failures.push("submission-tests:invalid-json");
  }
}

for (const skillName of skillNames) {
  const skillRoot = join("skills", skillName);
  const skillPath = join(packageRoot, skillRoot, "SKILL.md");
  requirePath(`${skillRoot}/SKILL.md`);
  requirePath(`${skillRoot}/scripts/run-example.mjs`);
  requirePath(`${skillRoot}/resources`);
  if (!existsSync(join(sharedRoot, "skills", skillName, `index${sharedExtension}`))) {
    failures.push(`missing:shared-skill-implementation:${skillName}`);
  }
  if (!existsSync(join(sharedRoot, "skills", skillName, `tests${sharedExtension}`))) {
    failures.push(`missing:shared-skill-tests:${skillName}`);
  }
  requirePath(`tests/skills/${skillName}/tests.ts`);

  if (existsSync(skillPath)) {
    const text = readFileSync(skillPath, "utf8");
    const metadata = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!metadata) {
      failures.push(`metadata:${skillName}:missing-frontmatter`);
    } else {
      if (!new RegExp(`^name:\\s*${skillName}\\s*$`, "m").test(metadata[1])) {
        failures.push(`metadata:${skillName}:name-mismatch`);
      }
      if (!/^description:\s*\S.+$/m.test(metadata[1])) {
        failures.push(`metadata:${skillName}:missing-description`);
      }
    }
  }

  const resourceRoot = join(packageRoot, skillRoot, "resources");
  if (existsSync(resourceRoot) && readdirSync(resourceRoot).length === 0) {
    failures.push(`resources:${skillName}:empty`);
  }
}

const result = {
  package: "beetrust-plugin",
  skills: skillNames.length,
  valid: failures.length === 0,
  failures
};

console.log(JSON.stringify(result, null, 2));
if (failures.length > 0) process.exitCode = 1;
