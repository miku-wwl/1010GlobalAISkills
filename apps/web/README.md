# BeeTrust Honey Export Release Desk

BeeTrust is a deterministic TypeScript MVP for the SP-A Collaborative Orchestration Hub scenario. It models one New Zealand Mānuka honey export case from intent to a broker-ready release recommendation.

This repository supports collaborative development and review.

The package contains seven connected skills:

1. `orchestration-hub` parses intent, builds a dependency DAG, dispatches roles and retries failed tasks.
2. `fingerprint-evidence` compares a laboratory CSV/report extract with a reference batch.
3. `custody-ledger` creates and verifies a SHA-256 chain of custody.
4. `mpi-market-access` evaluates versioned MPI evidence snapshots.
5. `customs-clearance` proposes HS codes, estimates costs and generates invoice, packing list and TSW draft objects.
6. `trade-risk-adversary` injects six controlled faults and observes the gates.
7. `evidence-monitor` distils all outputs into `RELEASE`, `REVIEW` or `BLOCKED`.

## Track B / SP-A package readiness

`track-b-package.json` is the explicit local package manifest. It records the seven
Skills, their contracts, implementations, tests, resources, shared `SkillMessage/v1`
schema and the SP-A main pipeline.

The `knowledge/` directory makes the distillation auditable: each MPI or Customs rule
maps from a public source ID to a TypeScript branch and a self-test. The representative
enterprise context uses Comvita's public investor page only; it does not claim access to
Comvita's private SOPs or shipment records.

Run the local acceptance report with:

```powershell
npm run acceptance
```

The report checks package structure, at least six registered Skills, at least 20
passing self-tests per Skill, both registered and user-like trigger fixtures,
framework-compatible team descriptors, fail-closed invalid-input branches, and
the red-team end-to-end pipeline. Each Skill also contains a runnable example
under `skills/<name>/scripts/`; `evidence-source-register.json` records the public
source URLs used by the domain rules. `npm run pack:trackb` additionally creates
a source package at `dist/beetrust-trackb-spa.zip`.

These commands prove a local, installable source package only. They do not claim
WorkHub publication, a Wesome workspace link, live marketplace status, or a live
AutoGen/AgentVerse runtime.

## Run

```powershell
cd apps/web
npm ci
npm run build
npm test
npm run demo
npm run demo:live
npm run demo:incident
```

`npm run demo:live` performs a real HTTP fetch against the public NZ Customs tariff page, checks for tariff/classification content, and records response metadata plus a SHA-256 snapshot hash. The normal demo uses deterministic snapshots so judging is repeatable. No request is submitted to TSW, no certificate is issued, and no real laboratory or MPI assurance is fabricated.

`npm run demo:incident` opens the same dashboard with Incident Room controls. Click any
of the six faults to replay a `RELEASE -> BLOCKED` branch, then restore the baseline.
The page shows evidence coverage, fault detection, parallel agent count and a labelled
pilot time proxy. These are reproducible fixture metrics, not a claim about a live
enterprise's historical savings.

The demo also writes `dist/beetrust-dashboard.html`, a self-contained runtime view of the DAG, evidence gates, red-team outcomes and `SkillMessage/v1` timeline. The `dist/` directory is generated and can be removed before a clean rebuild.

## Shared protocol

Every dispatch event uses `SkillMessage/v1`:

```text
{ id, caseId, correlationId, skill, type, timestamp, attempt, status, payload, evidenceRefs }
```

The `.agents/skills/` files are Codex discovery entry points. Their canonical contracts and resources live in `apps/web/skills/`, and the single TypeScript implementation for all seven Skills lives in `apps/web/src/skills/`. The plugin's thin runtime adapters import that same TypeScript source and compile it into the plugin build output; the skill rules, types, tests, workflow, and protocol are not copied into a second source tree.

All seven roles register their trigger words in `src/trigger-registry.ts`, so an incoming command can be routed to one or more skills without introducing a second protocol.

`src/framework-bridge.ts` emits GraphFlow-style AutoGen and planner/worker AgentVerse team descriptors from the same DAG. `src/framework-runtime.ts` compiles and executes the handlers through the open-source LangGraph `StateGraph` runtime: independent agents run concurrently, barrier dependencies are enforced, retries are observed, and every hand-off is a `SkillMessage/v1`. The graph has no model or network dependency, so judging remains deterministic; a production deployment can replace the transport while keeping the contract unchanged.

The workflow is `Intent Input -> Task Decomposition / Planning -> Multi-Agent Division of Labor & Collaboration -> Result Completion & Monitoring`. Fingerprint, custody and MPI roots can run independently; customs waits for MPI; adversary waits for operational outputs; monitoring is the final release gate. `observeSwarm()` reports root-agent parallelism, dependency edges, critical path and per-agent message counts for runtime visualization.

## Demo case and business value

The demonstrator uses Comvita Limited as the named New Zealand case owner because its public investor centre is verifiable. It does not claim that Comvita supplied this synthetic shipment or that the demo buyer is a real customer. The case models a 1,000-jar UMF Mānuka honey shipment from New Zealand to Australia and produces an explainable evidence matrix, a landed-value estimate, document drafts and six negative-path decisions. Replace the fixtures with accredited lab records, current MPI destination rules and broker-confirmed tariff data before any real shipment.

## Evidence sources

- MPI honey export steps: https://www.mpi.govt.nz/export/food/honey-and-bee-products/steps-to-exporting
- MPI honey requirements: https://www.mpi.govt.nz/export/food/honey-and-bee-products/requirements
- MPI animal-product export certificates: https://www.mpi.govt.nz/export/export-requirements/export-certification/animal-product-export-certificates
- NZ Customs tariff classifications and rates: https://www.customs.govt.nz/business/tariffs/tariff-classifications-and-rates
- NZ Customs clear exports: https://www.customs.govt.nz/business/export/clear-your-exports
- NZ Customs Trade Single Window getting started: https://www.customs.govt.nz/business/trade-single-window-tsw/getting-started
- MFAT guide to using free trade agreements: https://www.mfat.govt.nz/en/trade/how-we-help-exporters/guide-to-using-free-trade-agreements-for-goods-exporters
- Comvita public investor centre: https://comvita.co.nz/pages/investor-centre

Each skill has a local `skills/<name>/SKILL.md` contract and supporting TypeScript implementation and tests in `src/skills/<name>/`. The seven suites currently run 198 cases. `npm run acceptance` also executes every runnable Skill example, checks contract sections, validates the knowledge package and verifies the two public demo decks are included in the release archive.
