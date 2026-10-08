import { runAllSelfTests } from "../../apps/web/src/self-test.js";
import { runTradeCase } from "../../apps/web/src/workflow.js";
import { observeSwarm, renderPlanLevels, renderRuntimeTimeline } from "../../apps/web/src/skills/orchestration-hub/index.js";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderDashboardHtml } from "./dashboard.js";
import { runAcceptance } from "./acceptance.js";
import { findPluginRoot } from "./package-paths.js";

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  if (args.has("--test")) {
    const summaries = await runAllSelfTests();
    const total = summaries.reduce((sum, item) => sum + item.passed, 0);
    console.log(JSON.stringify({ skills: summaries, totalCases: total, allPassed: true }, null, 2));
    return;
  }
  if (args.has("--acceptance")) {
    const report = await runAcceptance();
    console.log(JSON.stringify(report, null, 2));
    if (!report.allPassed) process.exitCode = 1;
    return;
  }
  const traceEnabled = args.has("--live") || args.has("--incident") || args.has("--trace");
  if (traceEnabled) process.env.BEETRUST_TRACE = "1";
  const workflow = await runTradeCase(undefined, { liveSources: args.has("--live"), includeRedTeam: true });
  const pluginRoot = findPluginRoot(import.meta.url);
  const dashboardPath = join(pluginRoot, "dist", "beetrust-dashboard.html");
  writeFileSync(dashboardPath, renderDashboardHtml(workflow), "utf8");
  console.log("BeeTrust Honey Export Release Desk");
  console.log(`Case: ${workflow.tradeCase.caseId} | Batch: ${workflow.tradeCase.batchId}`);
  console.log(`Baseline decision: ${workflow.baseline.decision} (${workflow.baseline.score}/100)`);
  console.log("DAG levels: " + renderPlanLevels(workflow.plan));
  const swarm = observeSwarm(workflow.plan, workflow.tradeCase.messages);
  console.log(`Swarm observation: ${swarm.parallelRootCount} root agents, ${swarm.collaborationEdges} dependency edges, critical path ${swarm.criticalPathLength} stages`);
  console.log(`Framework runtime: ${workflow.frameworkRuntime.provider} ${workflow.frameworkRuntime.runtimeVersion} | executed=${workflow.frameworkRuntime.executed}`);
  console.log(`Business KPIs: evidence ${workflow.kpis.evidenceCoveragePct}%, fault detection ${workflow.kpis.faultDetectionPct}%, pilot time proxy ${workflow.kpis.estimatedTimeReductionPct}%`);
  console.log(`Runtime events: ${workflow.tradeCase.messages.length} (see JSON/API for full SkillMessage/v1 payloads)`);
  console.log(`Dashboard: ${dashboardPath}`);
  if (args.has("--incident")) console.log("Incident Room: use the Inject buttons in the dashboard to replay faults and restore the baseline.");
  if (!traceEnabled) console.log(renderRuntimeTimeline(workflow.tradeCase.messages.slice(0, 12)));
  console.log("Red-team decisions:");
  for (const scenario of workflow.redTeam) console.log(`  ${scenario.fault.padEnd(24)} ${scenario.decision} | ${scenario.findings[0]?.observed ?? "no active finding"}`);
  console.log(JSON.stringify({ baseline: workflow.baseline, frameworkRuntime: workflow.frameworkRuntime, kpis: workflow.kpis, generatedDocuments: workflow.tradeCase.customs?.documents.map((document) => document.documentType), liveSourceLookup: args.has("--live") }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});

export { runAllSelfTests } from "../../apps/web/src/self-test.js";
export { runAcceptance } from "./acceptance.js";
export { runTradeCase } from "../../apps/web/src/workflow.js";
