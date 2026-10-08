# BeeTrust repository baseline inventory

Measured before repository changes on 2026-10-08 in `D:\workshop\oct\1010GlobalAISkills`.

## Git state

- Branch: `main`
- HEAD: `4029b0419c730b8a84e48287177a5e637f4c9acc`
- Remote: `git@github.com:miku-wwl/1010GlobalAISkills.git` (fetch and push)
- Initial worktree: clean; no untracked or modified files
- Tracked files: 6,033
- Tracked checkout bytes: 297,688,553 (decimal bytes; includes vendored dependencies and generated output)
- Worktree bytes excluding `.git`: 297,688,553
- Git pack storage: 174.40 MiB (`git count-objects -vH`); this is historical object storage, not checkout size

At the initial audit every file outside `.git` was tracked. The only ignore rule was `/documentation/`.

## Directory inventory

| Path | Files | Bytes | Classification |
|---|---:|---:|---|
| `apps/web/node_modules/` | 5,494 | 77,012,529 | Installed third-party dependencies, tracked by mistake |
| `apps/web/dist/` | 97 | 10,598,612 | TypeScript output, generated dashboard, and Track B package staging/archive |
| `apps/web/src/` | 28 | 182,428 | Application and canonical TypeScript implementation |
| `beetrust-plugin/src/` | 29 | 195,008 | Plugin entry points plus a second copy of shared implementation |
| `apps/web/skills/` | 21 | 15,384 | Canonical skill contracts, examples, and resource fixtures |
| `beetrust-plugin/skills/` | 28 | 26,018 | Independently packaged plugin contracts, examples, resources, and cases |
| `.agents/skills/` | 7 | 5,711 | Repository Codex skill-discovery entry points |
| `tmp/` | 259 | 100,520,956 | PDF/PPTX review renders and video/demo captures; retained pending scoped cleanup |
| `output/` | 7 | 10,382,250 | Submission PDFs, cover assets, summary, and plugin archive |
| `beetrust-plugin/assets/` | 2 | 5,242,373 | Plugin icon and entry cover |

The repository also tracks the 83,650,789-byte `1010 Digital Human Festival--.pptx`, two smaller demo decks, competition rules, submission PDFs, and demo recording instructions. These are retained as project materials.

## Source duplication and dependency footprint

- TypeScript lines under `apps/web/src/`: 2,483.
- TypeScript lines under `beetrust-plugin/src/`: 2,741.
- Exact cross-package duplicates: 25 source files, 1,586 lines and 99,812 bytes per extra copy. These include all seven Skill implementations and tests, shared types/protocol, workflow, runtime, hashing, trigger registry, and public API.
- Three same-path files differed: `acceptance.ts` has a package-root path adjustment; `dashboard.ts` has separate visual/interaction behavior; `index.ts` has package-specific output handling.
- Additional plugin-only source: `mcp-server.ts`.
- Tracked dependency source: 3,237 TypeScript/JavaScript declaration or source files, 870,720 lines.
- Each package has 1 runtime dependency, 2 development dependencies, and 25 locked package entries. Both lockfiles describe the same dependency graph and are retained for independent package installs.
- No direct dependency was identified as unused: LangGraph is used by the StateGraph runtime; TypeScript and Node types are required to build the packages.

## Tracked large-file leaders

The largest files included a competition PPTX (83.65 MB), two raw demo recordings (9.81 MB and 5.80 MB), vendored TypeScript compiler files (9.31 MB and 6.35 MB), `js-tiktoken` bundles (about 5.60 MB each), and a plugin archive (4.95 MB). The PPTX, recordings, and submission archive are retained; dependencies and build output are candidates for removal from Git tracking.

## Baseline commands

All application commands were run from `apps/web` before source changes:

| Command | Result |
|---|---|
| `npm run build` | PASS |
| `npm test` | PASS, 198 cases across 7 Skills |
| `npm run demo:live` | PASS, baseline `RELEASE (100/100)`, 6 controlled faults `BLOCKED`, live source lookup enabled |
| `npm run demo:incident` | PASS, baseline `RELEASE (100/100)`, 6 controlled faults `BLOCKED` |

`beetrust-plugin/npm run verify` first could not find `tsc` because that package's dependencies were absent. After `npm ci` installed its 25 locked packages, `npm run verify` passed: package structure valid, 198 self-tests, and the acceptance report passed including seven runnable Skill examples and the live Customs source check. The install did not change either package lockfile.

Measured TypeScript build times before source changes: Web 3,209 ms; plugin 3,089 ms. The full initial build/demo command batch took 29.7 seconds in the execution wrapper, including tool startup and streamed output. No Git history rewrite was performed or is planned.
