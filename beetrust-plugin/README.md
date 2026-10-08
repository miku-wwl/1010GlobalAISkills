# BeeTrust Plugin

BeeTrust is an evidence-backed workflow package for cross-border New Zealand Mānuka honey release decisions.

The package contains seven independently documented Skills covering trade orchestration, scientific evidence, custody integrity, MPI market access, customs clearance, adversarial risk testing, and final evidence monitoring.

## Submission materials

- Listing metadata: `submission-metadata.json`
- ChatGPT Apps submission import: `chatgpt-app-submission.json`
- Directory and composer icon: `assets/beetrust-plugin-icon.png`
- Entry cover: `assets/beetrust-entry-cover.png`
- Project home: https://github.com/dengcong80/1010GlobalAISkills/tree/main/beetrust-plugin
- Support: `docs/support.md`
- Privacy policy: `docs/privacy-policy.md`
- Terms of use: `docs/terms-of-use.md`
- Public test cases: `tests/public-submission-test-cases.json`
- Availability: New Zealand and Australia for the supported demonstration route

## Shared implementation and local verification

The canonical TypeScript business core and its seven Skill suites live in `../apps/web/src/`. This package keeps its MCP server, package-specific dashboard and acceptance adapters in `src/`; the plugin TypeScript build compiles the shared source into `dist/apps/web/src/` beside the plugin runtime in `dist/beetrust-plugin/src/`. The `public-api.ts` file is a compatibility re-export of that shared API.

From this directory, install the locked dependencies and verify the package:

Run these commands from this directory:

```powershell
npm install
npm run verify
```

`verify:package` checks the Plugin manifest, Skill metadata, resources, scripts, shared implementations, and mirrored test files. `test` runs the shared TypeScript self-tests. `acceptance` runs the end-to-end BeeTrust acceptance suite. `npm pack` builds the runtime first and includes the precompiled shared core so the package can be verified from a clean install.

To run the MCP server locally, use `npm run mcp`; it listens on port `8787` and exposes seven read-only tools: `beetrust_orchestrate`, `beetrust_fingerprint_evidence`, `beetrust_custody_ledger`, `beetrust_mpi_market_access`, `beetrust_customs_clearance`, `beetrust_trade_risk_adversary`, and `beetrust_evidence_monitor`.

## Supported demonstration intent

```text
Release 1000 jars of UMF Mānuka honey from New Zealand to Australia for AU retail review.
```

The baseline case must produce `RELEASE`; controlled red-team faults must produce `BLOCKED` without changing the baseline case.

## Public plugin submission

Upload the final `plugin.json` and `skills/` tree as a skills-only plugin package. The `src/`, `tests/`, resources, and verification scripts are retained for independent technical verification and release evidence.
