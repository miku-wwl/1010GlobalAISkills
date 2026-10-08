# BeeTrust project instructions

## Project skill discovery

The repository-level Codex skill entry points are under `.agents/skills`. Each entry point delegates to the canonical skill package under `apps/web/skills` and to the TypeScript implementation under `apps/web/src/skills`.

Read the selected `.agents/skills/<skill>/SKILL.md` and its canonical `apps/web/skills/<skill>/SKILL.md` before executing that workflow.

## Runtime architecture

- `orchestration-hub` parses the supported trade intent, creates the dependency-aware DAG, and dispatches work.
- `fingerprint-evidence`, `custody-ledger`, and `mpi-market-access` are the three parallel root agents.
- `customs-clearance` runs after the root agents complete.
- `trade-risk-adversary` runs after the operational evidence is assembled.
- `evidence-monitor` is the final release gate and emits `RELEASE`, `REVIEW`, or `BLOCKED`.
- The runtime protocol is `SkillMessage/v1` and the execution provider is the existing LangGraph StateGraph adapter.

## Supported demo contract

Use this supported happy-path intent unless a test explicitly supplies another supported fixture:

`Release 1000 jars of UMF Mānuka honey from New Zealand to Australia for AU retail review.`

Do not introduce arbitrary Shanghai, MGO 550+, or unsupported destination parsing.

Red-team demonstrations must use the existing controlled fault catalogue and must preserve the original baseline case.

## Implementation constraints

- Keep the existing TypeScript API contract.
- Keep `apps/web/skills` as the canonical documentation and resource location.
- Keep the canonical TypeScript Skill implementations in `apps/web/src/skills`; plugin runtime adapters must import that source rather than add mirrored business logic.
- `beetrust-plugin` compiles the shared source into its ignored `dist/apps/web/src/` output and keeps only plugin-specific entry points under `beetrust-plugin/src/`.
- Do not move runnable examples without checking their `apps/web/dist` relative imports.
- Do not claim a demo passed from static inspection; build and execute the relevant commands.

## Verification

Run from `apps/web` when validating the project:

- `npm run build`
- `npm test`
- `npm run demo:live`
- `npm run demo:incident`

Live traces should include `SkillMessage/v1`, DAG creation, agent lifecycle events, custody `previousHash`, custody `hash`, final `headHash`, and the evidence-monitor decision.
