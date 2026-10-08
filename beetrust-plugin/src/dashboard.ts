import type { SkillName, WorkflowRun } from "../../apps/web/src/types.js";

const DEMO_SCENARIOS: Array<{ id: string; kicker: string; title: string; description: string; target: string }> = [
  { id: "scenario-a", kicker: "SCENARIO A · BLUE TEAM", title: "Happy Path", description: "Run three evidence checks in parallel, complete the release gates, and demonstrate RELEASE.", target: "execution-sequence" },
  { id: "scenario-b", kicker: "SCENARIO B · RED TEAM", title: "Fault Injection", description: "Replay a controlled fault, halt the shipment, and verify that the baseline case stays unchanged.", target: "scenario-b" }
];

export function renderDashboardHtml(run: WorkflowRun): string {
  const skillRecords = buildSkillRecords(run);
  const skillData = JSON.stringify(skillRecords).replaceAll("<", "\\u003c");
  const incidentData = JSON.stringify({ baseline: run.baseline, redTeam: run.redTeam, runtime: run.tradeCase.messages }).replaceAll("<", "\\u003c");
  const firstSkill = run.plan.nodes[0]?.skill ?? "fingerprint-evidence";
  const workflowOrder = JSON.stringify(run.plan.nodes.map((node) => node.skill));
  const fingerprintMatch = run.tradeCase.fingerprint ? `${Math.round(run.tradeCase.fingerprint.similarity * 100)}%` : "PENDING";
  const antiCounterfeitCode = `BT-${run.tradeCase.batchId.replaceAll("-", "")}-7K4P`;
  const scenarioButtons = DEMO_SCENARIOS.map((scenario) => `<button class="scenario-switch-button ${escapeHtml(scenario.id)}-switch" data-target="${escapeHtml(scenario.target)}" onclick="jumpToScenario('${escapeJs(scenario.target)}')"><span class="scenario-switch-kicker">${escapeHtml(scenario.kicker)}</span><strong>${escapeHtml(scenario.title)}</strong><small>${escapeHtml(scenario.description)}</small><em>Open scenario →</em></button>`).join("");
  const nodes = run.plan.nodes.map((node, index) => `<button class="node skill-card" id="skill-node-${escapeHtml(node.skill)}" data-skill="${escapeHtml(node.skill)}" onclick="showSkill('${escapeJs(node.skill)}')"><div class="skill-card-title"><strong>${index + 1}. ${escapeHtml(node.skill)}</strong><span class="skill-status pending" id="skill-status-${escapeHtml(node.skill)}">PENDING</span></div><small>${escapeHtml(node.purpose)}</small><span>depends on: ${node.dependsOn.length ? escapeHtml(node.dependsOn.join(", ")) : "none"}</span><em>Click to inspect skill output →</em></button>`).join("");
  const gateRows = run.baseline.gates.map((gate) => `<tr><td>${escapeHtml(gate.gate)}</td><td id="gate-${escapeHtml(gate.gate)}" class="${gate.status.toLowerCase()}">${escapeHtml(gate.status)}</td><td>${gate.evidenceRefs.length}</td><td>${escapeHtml(gate.reason)}</td></tr>`).join("");
  const redRows = run.redTeam.map((scenario) => `<tr class="fault-row" data-fault="${escapeHtml(scenario.fault)}"><td><button class="fault-button" data-fault="${escapeHtml(scenario.fault)}" onclick="selectIncident('${escapeJs(scenario.fault)}')">Inject fault</button> <code>${escapeHtml(scenario.fault)}</code></td><td id="fault-decision-${escapeHtml(scenario.fault)}" class="fault-state ready">READY</td><td id="fault-observed-${escapeHtml(scenario.fault)}">${escapeHtml(scenario.findings[0]?.observed ?? "")}</td></tr>`).join("");
  const kpiCards = [
    ["Evidence coverage", `${run.kpis.evidenceCoveragePct}%`, "gates with evidence refs"],
    ["Fault detection", `${run.kpis.faultDetectionPct}%`, "red-team cases blocked"],
    ["Parallel roots", String(run.kpis.parallelRootAgents), "independent agents"],
    ["Pilot time proxy", `${run.kpis.estimatedTimeReductionPct}%`, `${run.kpis.estimatedManualMinutes} → ${run.kpis.estimatedOrchestratedMinutes} min estimate`]
  ].map(([label, value, note]) => `<div class="kpi"><b>${escapeHtml(label)}</b><strong>${escapeHtml(value)}</strong><span>${escapeHtml(note)}</span></div>`).join("");
  const runtimeAgents = run.frameworkRuntime.agentRuns.map((agent) => `<div class="runtime-agent" id="runtime-agent-${escapeHtml(agent.skill)}"><span class="runtime-dot"></span><strong>${escapeHtml(agent.skill)}</strong><span class="runtime-agent-status">PENDING</span></div>`).join("");
  const script = renderClientScript({ incidentData, skillData, baselineDecision: run.baseline.decision, firstSkill, workflowOrder });

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>BeeTrust Honey Export Release Desk</title>
  ${renderStyles()}
  ${renderFlowStyles()}
</head>
<body>
  <div class="hero">
    <div class="hero-media" aria-hidden="true"><img src="../assets/beetrust-honey-hero.png" alt="New Zealand Manuka honey apiary and export warehouse" /></div>
    <div class="hero-copy">
      <div class="hero-kicker">NZ MANUKA EXPORT CONTROL TOWER</div>
      <h1>BeeTrust Honey Export Release Desk</h1>
      <div class="hero-subtitle">1,000-jar Mānuka honey · New Zealand → Australia</div>
      <div class="hero-route"><span>Waikato apiary</span><b>→</b><span>Quality lab</span><b>→</b><span>Export warehouse</span><b>→</b><span>AU retail review</span></div>
      <div class="hero-identifiers">Case ${escapeHtml(run.tradeCase.caseId)} · batch ${escapeHtml(run.tradeCase.batchId)}</div>
      <div class="hero-question">Question this demo answers: can this shipment leave the warehouse?</div>
    </div>
    <div id="decision-badge" class="badge">${escapeHtml(run.baseline.decision)}</div>
  </div>

  <nav class="scenario-switcher" aria-label="Demo scenarios">${scenarioButtons}</nav>

  <section class="demo-toolbar" aria-live="polite">
    <div><strong>Interactive demo status</strong><span id="demo-status">No scenario has run yet. Start Scenario A or inject a Scenario B fault.</span></div>
  </section>

  <div class="kpis">${kpiCards}</div>

  <section class="business-context" id="business-context" aria-label="Industrial business context">
    <div class="business-context-copy">
      <span class="context-kicker">INDUSTRIAL BUSINESS CONTEXT</span>
      <h2>From apiary evidence to export release</h2>
      <p>Every decision links the physical honey shipment to scientific evidence, custody events, market rules and customs documents before the warehouse releases the batch.</p>
      <div class="context-route"><span class="context-route-dot"></span><strong>Waikato Apiary</strong><span>→</span><strong>Food-grade processing</strong><span>→</span><strong>AU retail review</strong></div>
      <div class="context-tags"><span>1,000 jars</span><span>UMF Mānuka</span><span>NZ → AU</span><span>Auditable release</span></div>
    </div>
    <div class="business-context-visual warehouse-visual"><img src="../assets/beetrust-export-warehouse.png" alt="Honey export warehouse with pallets and quality-control station" loading="lazy" /></div>
    <div class="business-context-visual product-visual"><img src="../assets/beetrust-honey-jar-lab.png" alt="Manuka honey jar in a quality-control laboratory" loading="lazy" /><div class="product-caption"><span>Physical product evidence</span><strong>Batch identity verified</strong></div></div>
  </section>

  <section class="trade-control-grid" id="traceability-controls" aria-label="Traceability and cross-border compliance controls">
    <article class="passport-panel">
      <div class="panel-eyebrow">DIGITAL PRODUCT PASSPORT · DEMO CASE</div>
      <div class="passport-layout">
        <div class="passport-jar-stage">
          <img src="../assets/beetrust-traceability-jar.png" alt="Manuka honey product with a blank traceability label area" loading="lazy" />
          <div class="passport-label-overlay"><span class="brand-mark">BeeTrust</span><strong>MĀNUKA<span>™</span> TRACE</strong><small>NEW ZEALAND ORIGIN</small></div>
        </div>
        <div class="passport-copy">
          <div class="passport-heading"><div><span class="context-kicker">PRODUCT AUTHENTICITY</span><h2>One jar, one verifiable identity</h2></div><span class="verified-pill">VERIFIED</span></div>
          <div class="passport-field"><span>Anti-counterfeit code</span><code>${escapeHtml(antiCounterfeitCode)}</code><b>VALID</b></div>
          <div class="passport-field"><span>Multi-dimensional biochemical fingerprint</span><strong>${escapeHtml(fingerprintMatch)} reference match</strong><small>MGO · leptosperin · origin profile</small></div>
          <div class="passport-field zkp-field"><span>Privacy proof</span><strong>ZKP proof · DEMO VERIFIED</strong><small>Claim validated without exposing raw lab data</small></div>
          <div class="passport-footnote">Illustrative product mark, verification code and ZKP presentation layer for this demo. Not an official MPI seal or government-issued certificate.</div>
        </div>
      </div>
    </article>

    <div class="compliance-stack">
      <article class="compliance-card mpi-compliance-card">
        <div class="compliance-icon">✓</div><div class="compliance-copy"><span>MPI e-CERTIFICATION</span><strong>Animal product route verified</strong><small>RMP · OMAR · export certificate · MPI-AU-2026.09</small></div><b class="compliance-status">PASS</b>
      </article>
      <article class="compliance-card customs-compliance-card">
        <div class="compliance-icon">⌘</div><div class="compliance-copy"><span>SMART CUSTOMS DECLARATION</span><strong>HS 0409.00 · TSW draft ready</strong><small>Commercial invoice · packing list · landed-cost estimate</small></div><b class="compliance-status">READY</b>
      </article>
      <article class="compliance-card clearance-compliance-card">
        <div class="compliance-icon">→</div><div class="compliance-copy"><span>OVERSEAS CLEARANCE</span><strong>New Zealand → Australia</strong><small>Broker review queue · destination rule snapshot matched</small></div><b class="compliance-status">CLEAR</b>
      </article>
      <div class="compliance-disclaimer">DEMO CONTROL TOWER · Regulatory cards are illustrative workflow states, not government-issued certificates.</div>
    </div>
  </section>

  <section class="scenario-section blue-scenario" id="scenario-a">
    <div class="scenario-banner">
      <div>
        <span class="scenario-kicker">SCENARIO A</span>
        <h2>Blue Team · Happy Path</h2>
        <p>Run the normal evidence workflow and show why the shipment can be released.</p>
      </div>
    </div>

    <div class="panel execution-panel" id="execution-sequence">
      <h2>Execution sequence</h2>
      <p class="panel-intro">Watch the orchestration hub create the DAG, launch the three root agents in parallel, then continue through the sequential release gates.</p>
      <div class="flow-diagram" aria-label="Seven-step execution sequence">
        <div class="flow-track">
          <div class="flow-node sequence-step pending" id="sequence-step-1">
            <span class="flow-number">1</span><span class="flow-icon">${renderFlowIcon("hub")}</span><strong>orchestration-hub</strong><span class="flow-title">Create DAG</span><em>PENDING</em>
          </div>
          <span class="flow-arrow">→</span>
          <div class="flow-group sequence-step pending" id="sequence-step-2">
            <span class="flow-number">2</span><strong>3 Root Agents</strong><span class="flow-title">Parallel Start</span>
            <div class="flow-agent-grid">
              <div class="flow-agent" id="flow-agent-fingerprint-evidence"><span class="flow-agent-icon">${renderFlowIcon("fingerprint")}</span><b>fingerprint-<br>evidence</b><small>Scientific evidence</small><i>PENDING</i></div>
              <div class="flow-agent" id="flow-agent-custody-ledger"><span class="flow-agent-icon">${renderFlowIcon("custody")}</span><b>custody-<br>ledger</b><small>Custody flow</small><i>PENDING</i></div>
              <div class="flow-agent" id="flow-agent-mpi-market-access"><span class="flow-agent-icon">${renderFlowIcon("mpi")}</span><b>mpi-market-<br>access</b><small>Market rules</small><i>PENDING</i></div>
            </div>
            <em>PENDING</em>
          </div>
          <span class="flow-arrow">→</span>
          <div class="flow-group sequence-step pending" id="sequence-step-3">
            <span class="flow-number">3</span><strong>All 3 Root Agents</strong><span class="flow-title">Completed</span>
            <div class="flow-agent-grid">
              <div class="flow-agent" id="flow-complete-fingerprint-evidence"><span class="flow-agent-icon">${renderFlowIcon("fingerprint")}</span><b>fingerprint-<br>evidence</b><i>PENDING</i></div>
              <div class="flow-agent" id="flow-complete-custody-ledger"><span class="flow-agent-icon">${renderFlowIcon("custody")}</span><b>custody-<br>ledger</b><i>PENDING</i></div>
              <div class="flow-agent" id="flow-complete-mpi-market-access"><span class="flow-agent-icon">${renderFlowIcon("mpi")}</span><b>mpi-market-<br>access</b><i>PENDING</i></div>
            </div>
            <small class="flow-note">All 3 agents finished before continuing.</small><em>PENDING</em>
          </div>
          <span class="flow-arrow">→</span>
          <div class="flow-node sequence-step pending" id="sequence-step-4">
            <span class="flow-number">4</span><span class="flow-icon">${renderFlowIcon("customs")}</span><strong>customs-clearance</strong><span class="flow-title">Start</span><em>PENDING</em>
          </div>
          <span class="flow-arrow">→</span>
          <div class="flow-node sequence-step pending" id="sequence-step-5">
            <span class="flow-number">5</span><span class="flow-icon">${renderFlowIcon("adversary")}</span><strong>trade-risk-<br>adversary</strong><span class="flow-title">Start</span><em>PENDING</em>
          </div>
          <span class="flow-arrow">→</span>
          <div class="flow-node sequence-step pending" id="sequence-step-6">
            <span class="flow-number">6</span><span class="flow-icon">${renderFlowIcon("monitor")}</span><strong>evidence-<br>monitor</strong><span class="flow-title">Start</span><em>PENDING</em>
          </div>
          <span class="flow-arrow">→</span>
          <div class="flow-decision sequence-step pending" id="sequence-step-7">
            <span class="flow-number">7</span><strong>Decision Output</strong>
            <div class="decision-options"><span class="decision-option release-option">✓ <b>RELEASE</b></span><span class="decision-option review-option">⌕ <b>REVIEW</b></span><span class="decision-option blocked-option">○ <b>BLOCKED</b></span></div>
            <span class="flow-decision-result">Current: <b id="sequence-decision">RELEASE / REVIEW / BLOCKED</b></span><em>PENDING</em>
          </div>
        </div>
        <div class="flow-timeline">
          <div class="flow-timeline-step"><b>1</b><span>Create DAG</span></div><i>→</i><div class="flow-timeline-step"><b>2</b><span>Start 3 root agents<br>in parallel (RUNNING)</span></div><i>→</i><div class="flow-timeline-step"><b>3</b><span>All 3 root agents<br>complete</span></div><i>→</i><div class="flow-timeline-step"><b>4</b><span>Start<br>customs-clearance</span></div><i>→</i><div class="flow-timeline-step"><b>5</b><span>Start<br>trade-risk-adversary</span></div><i>→</i><div class="flow-timeline-step"><b>6</b><span>Start<br>evidence-monitor</span></div><i>→</i><div class="flow-timeline-step"><b>7</b><span>Produce<br>decision output</span></div>
        </div>
        <div class="flow-bands"><div class="flow-band setup-band"><strong>SETUP</strong><span>Build the workflow</span></div><div class="flow-band parallel-band"><strong>PARALLEL EXECUTION</strong><span>3 root agents run at the same time</span></div><div class="flow-band sequential-band"><strong>SEQUENTIAL EXECUTION</strong><span>Runs after all root agents complete</span></div><div class="flow-band decision-band"><strong>DECISION</strong><span>One of three outcomes</span></div></div>
      </div>
    </div>

    <div class="blue-evidence-grid">
      <div class="blue-decision-column">
        <div class="panel" id="skill-cards">
          <div class="skill-panel-heading"><div><h2>How the release decision is built</h2><p class="panel-intro">Independent evidence checks run in parallel, then merge before the final release gate. Each card is clickable.</p></div><div class="skill-panel-actions"><button class="primary" onclick="runReleaseDemo()">Run Scenario A</button><button class="secondary light-button" onclick="resetDemo()">Reset demo</button></div></div>
          <div class="grid">${nodes}</div>
          <div class="skill-inspector" id="skill-inspector" aria-live="polite"><strong>Select a skill card</strong><span>Its output and evidence references will appear here after the run.</span></div>
        </div>

        <div class="panel" id="release-gates">
          <h2>Five release gates · <span id="score">${run.baseline.score}</span>/100</h2>
          <p class="panel-intro">The monitor recomputes the decision from evidence, not from an agent saying “pass”.</p>
          <table><thead><tr><th>Gate</th><th>Status</th><th>Evidence refs</th><th>Reason</th></tr></thead><tbody>${gateRows}</tbody></table>
        </div>
      </div>

      <div class="panel runtime-panel" id="runtime-handoff">
        <div class="panel-heading"><div><h2>Runtime hand-off · SkillMessage/v1</h2><p class="panel-intro">${escapeHtml(run.frameworkRuntime.provider)} · ${escapeHtml(run.frameworkRuntime.runtimeVersion)} · executed=${run.frameworkRuntime.executed}</p></div><span class="runtime-label">LIVE TRACE</span></div>
        <div class="runtime-agents">${runtimeAgents}</div>
        <ol id="runtime-timeline" class="runtime-timeline"><li class="timeline-empty">No Scenario A runtime events yet. Click Run Scenario A to start.</li></ol>
      </div>
    </div>
  </section>

  <section class="scenario-section red-scenario" id="scenario-b">
    <div class="scenario-banner red-banner">
      <div>
        <span class="scenario-kicker">SCENARIO B</span>
        <h2>Red Team · Adversarial Path</h2>
        <p>Inject a pre-computed fault, watch the release halt, and verify that the baseline case stays unchanged.</p>
      </div>
      <b id="incident-badge" class="scenario-badge red-ready">READY</b>
    </div>
    <div class="panel incident-panel" id="incident-room">
      <div class="panel-heading"><div><h2>Incident Room · live fault injection</h2><p class="panel-intro">Click a fault to replay the adversarial branch. The release badge changes to BLOCKED and the original case stays unchanged.</p></div><button class="restore" onclick="restoreBaseline()">Restore baseline RELEASE</button></div>
      <div id="incident-flow" class="incident-flow"><span>BASELINE RELEASE</span><b>→</b><span>READY FOR REPLAY</span></div>
      <table><thead><tr><th>Fault</th><th>Decision</th><th>Observed finding</th></tr></thead><tbody>${redRows}</tbody></table>
      <h3>Red-team replay timeline</h3>
      <ol id="red-timeline" class="red-timeline"><li class="timeline-empty">No Scenario B replay yet. Select Inject fault above.</li></ol>
    </div>
  </section>

  <script>${script}</script>
</body>
</html>`;
}

function renderStyles(): string {
  return `<style>
    :root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#103b31;background:#f4f7f5;line-height:1.35}
    *{box-sizing:border-box}body{max-width:1200px;margin:0 auto;padding:24px 30px 64px;background:#f4f7f5}button{font:inherit}h1,h2,h3,p{margin-top:0}h1{font-size:42px;line-height:1.1;margin-bottom:8px}h2{font-size:25px;margin-bottom:8px}h3{font-size:18px;margin:24px 0 10px}.hero{display:flex;gap:24px;align-items:center;background:#123b30;color:#fff;padding:28px 30px;border-radius:16px}.hero-copy{flex:1}.hero-kicker,.scenario-kicker{display:block;color:#b8eacb;font-size:12px;font-weight:800;letter-spacing:.08em;margin-bottom:8px;text-transform:uppercase}.hero-question{margin-top:14px;color:#d8eee1}.badge{font-size:28px;font-weight:800;background:#46c979;color:#063b1e;padding:12px 18px;border-radius:12px;white-space:nowrap}.badge.blocked{background:#ffd7d2;color:#8d1b12}.badge.review{background:#ffe7b3;color:#7a4800}.decision-strip{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}.stage-button{display:inline-flex;align-items:center;gap:8px;border:1px solid #c9ded2;border-radius:999px;background:#eaf4ee;color:#103b31;padding:9px 14px;font-weight:700;cursor:pointer}.stage-button:hover,.stage-button.active{background:#ccefd9;border-color:#46c979}.stage-button b{color:#08753c}.demo-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 16px;margin:0 0 16px;border-radius:12px;background:#123b30;color:#fff}.demo-toolbar strong{display:block;font-size:15px}.demo-toolbar span{display:block;color:#d8eee1;font-size:13px;margin-top:3px}.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:18px}.kpi{background:#fff;border:1px solid #c9ded2;border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:5px}.kpi b{font-size:14px}.kpi strong{font-size:29px}.kpi span{font-size:12px;color:#567}.scenario-section{overflow:hidden;border-radius:16px;background:#fff;box-shadow:0 2px 9px #123b3014;margin:18px 0}.scenario-banner{display:flex;align-items:center;justify-content:space-between;gap:20px;background:#123b30;color:#fff;padding:22px 18px}.scenario-banner h2{margin:0 0 4px;font-size:24px}.scenario-banner p{margin:0;color:#d8eee1}.scenario-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}.scenario-badge{font-size:11px;letter-spacing:.03em;border-radius:999px;padding:6px 10px;background:#46c979;color:#063b1e;white-space:nowrap}.scenario-badge.red-ready{background:#d8eee1;color:#123b30}.scenario-badge.red-blocked{background:#ffd7d2;color:#9e2318}.primary,.secondary,.restore{border-radius:8px;padding:9px 13px;font-weight:800;cursor:pointer}.primary{border:0;background:#46c979;color:#063b1e}.primary:hover{background:#6ae195}.secondary{border:1px solid #79b995;background:transparent;color:#fff}.secondary:hover{background:#275444}.panel{background:#fff;padding:18px 16px;margin:0}.panel-intro{color:#456783;font-size:14px;margin-bottom:14px}.panel-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.execution-panel{padding-bottom:10px}.sequence-step{display:grid;grid-template-columns:28px 1fr auto;align-items:center;gap:10px;border:1px solid #c9ded2;border-radius:10px;padding:9px 10px;margin:8px 0;background:#f7fbf8;transition:.25s ease}.sequence-step>b{width:24px;height:24px;display:grid;place-items:center;border-radius:50%;background:#dcece2;color:#52756a}.sequence-step div{min-width:0}.sequence-step strong,.sequence-step span{display:block}.sequence-step span{color:#456783;font-size:12px}.sequence-step em{font-style:normal;color:#53746a;font-size:10px;font-weight:800}.sequence-step.running{border-color:#2cbf72;background:#ecfff3;box-shadow:0 0 0 3px #46c9792b}.sequence-step.running>b{background:#46c979;color:#063b1e}.sequence-step.running em{color:#08753c}.sequence-step.completed{border-color:#8bcaa4;background:#f1fbf4}.sequence-step.completed em{color:#08753c}.root-chips{display:flex!important;gap:6px;flex-wrap:wrap;margin-top:4px}.root-chips i{font-style:normal;background:#d9f7e4;color:#08753c;border-radius:999px;padding:2px 7px;font-size:11px}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.skill-card{appearance:none;text-align:left;background:#fff;border:1px solid #c9ded2;border-radius:11px;padding:14px;display:flex;flex-direction:column;gap:8px;box-shadow:0 2px 6px #123b3012;cursor:pointer;color:#103b31;min-height:158px}.skill-card:hover,.skill-card.selected{border-color:#2cbf72;box-shadow:0 0 0 3px #46c97925}.skill-card-title{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}.skill-card-title strong{font-size:16px}.skill-card small{min-height:40px;color:#456783}.skill-card>span{font-size:12px;color:#678}.skill-card em{font-style:normal;color:#08753c;font-size:12px;font-weight:800;margin-top:auto}.skill-status{font-size:10px;padding:3px 6px;border-radius:999px;background:#eaf0ec;color:#59756b;white-space:nowrap}.skill-status.running{background:#fff0bd;color:#855d00}.skill-status.pass{background:#d9f7e4;color:#08753c}.skill-status.blocked{background:#ffd7d2;color:#9e2318}.skill-inspector{margin-top:16px;border-left:4px solid #46c979;background:#f1fbf4;padding:13px 14px;display:flex;flex-direction:column;gap:3px}.skill-inspector span{font-size:13px;color:#456783}.skill-inspector code{word-break:break-word}.panel table{border-collapse:collapse;width:100%;font-size:13px}.panel td,.panel th{padding:9px;border-bottom:1px solid #deebe3;text-align:left;vertical-align:top}.pass,.release{color:#08753c;font-weight:800}.review{color:#9b5e00;font-weight:800}.blocked{color:#b42318;font-weight:800}code{background:#eaf4ee;padding:2px 5px;border-radius:4px;font-size:12px}.runtime-panel{border-top:1px solid #deebe3}.runtime-label{border-radius:999px;padding:5px 8px;background:#eaf4ee;color:#08753c;font-size:10px;font-weight:800}.runtime-agents{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:14px 0}.runtime-agent{display:flex;align-items:center;gap:7px;border:1px solid #c9ded2;border-radius:8px;padding:9px;background:#f7fbf8;font-size:12px}.runtime-agent-status{margin-left:auto;color:#60776d;font-size:10px;font-weight:800}.runtime-dot{width:8px;height:8px;background:#b4c5bc;border-radius:50%}.runtime-agent.running{border-color:#2cbf72;background:#ecfff3}.runtime-agent.running .runtime-dot{background:#e7ad00;box-shadow:0 0 0 4px #e7ad0033}.runtime-agent.pass{border-color:#8bcaa4}.runtime-agent.pass .runtime-dot{background:#2cbf72}.runtime-agent.blocked{border-color:#e89186}.runtime-agent.blocked .runtime-dot{background:#d84032}.runtime-timeline,.red-timeline{list-style:none;padding:0;margin:12px 0 0;border-left:2px solid #c9ded2}.runtime-timeline li,.red-timeline li{position:relative;margin:0 0 8px;padding:8px 10px 8px 18px;background:#f7fbf8;border-radius:0 8px 8px 0;font-size:12px}.runtime-timeline li:before,.red-timeline li:before{content:"";position:absolute;left:-6px;top:12px;width:9px;height:9px;background:#46c979;border-radius:50%}.timeline-empty{color:#678}.red-banner{background:#4c1f1b}.red-banner .scenario-kicker{color:#ffb5ab}.red-banner p{color:#ffe1dd}.red-scenario{border:1px solid #e8c4be}.incident-panel{padding-bottom:24px}.restore{border:0;background:#123b30;color:#fff;white-space:nowrap}.restore:hover{background:#275444}.incident-flow{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin:12px 0;padding:10px 12px;border-radius:8px;background:#fff8f6;color:#9e2318;font-size:12px;font-weight:800}.incident-flow b{color:#d59a92}.fault-button{border:1px solid #e8b5ae;border-radius:999px;background:#fff8f6;color:#9e2318;font-weight:800;padding:4px 9px;cursor:pointer}.fault-button:hover,.fault-button.active{background:#ffd7d2}.fault-row.active{background:#fff6f4}.fault-state{font-weight:800}.fault-state.ready{color:#60776d}.fault-state.blocked{color:#b42318}.red-timeline{border-left-color:#e8b5ae}.red-timeline li{background:#fff8f6}.red-timeline li:before{background:#d84032}.red-timeline li strong{color:#9e2318}.red-scenario h3{color:#7f261d}
    @media (max-width:900px){body{padding:16px}.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    .hero{position:relative;isolation:isolate;overflow:hidden;min-height:284px;background:#123b30}.hero-media{position:absolute;inset:0;z-index:-2}.hero-media img{width:100%;height:100%;object-fit:cover;object-position:center;display:block;filter:saturate(.95) contrast(1.03)}.hero::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(10,43,34,.97) 0%,rgba(16,59,48,.9) 38%,rgba(16,59,48,.48) 70%,rgba(16,59,48,.12) 100%)}.hero-copy{position:relative;z-index:1;max-width:760px}.hero-subtitle{font-size:18px;font-weight:700;color:#fff;margin-bottom:10px}.hero-route{display:flex;align-items:center;gap:8px;flex-wrap:wrap;color:#d8eee1;font-size:12px;font-weight:700}.hero-route b{color:#65df94;font-size:16px}.hero-identifiers{margin-top:10px;color:#b8eacb;font-size:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.hero .badge{position:relative;z-index:1;box-shadow:0 10px 30px #051f1645}.business-context{display:grid;grid-template-columns:minmax(250px,1.05fr) minmax(360px,1.25fr) minmax(180px,.6fr);gap:0;overflow:hidden;background:#fff;border:1px solid #c9ded2;border-radius:16px;margin:0 0 18px;box-shadow:0 2px 9px #123b3012}.business-context-copy{padding:24px 22px;display:flex;flex-direction:column;justify-content:center}.context-kicker{color:#08753c;font-size:11px;font-weight:900;letter-spacing:.1em;margin-bottom:8px}.business-context h2{font-size:24px;line-height:1.1;margin-bottom:10px}.business-context-copy p{color:#456783;font-size:14px;margin-bottom:14px}.context-route{display:flex;align-items:center;gap:7px;flex-wrap:wrap;color:#103b31;font-size:11px}.context-route span:not(.context-route-dot){color:#8ba398;font-size:15px}.context-route-dot{width:9px;height:9px;background:#46c979;border-radius:50%;box-shadow:0 0 0 4px #d9f7e4}.context-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:16px}.context-tags span{border-radius:999px;background:#eaf4ee;color:#08753c;padding:5px 8px;font-size:10px;font-weight:800}.business-context-visual{position:relative;min-height:236px;overflow:hidden;background:#dfeee6}.business-context-visual img{width:100%;height:100%;object-fit:cover;display:block}.warehouse-visual img{object-position:center}.product-visual{border-left:1px solid #c9ded2}.product-visual img{object-position:center 58%}.product-caption{position:absolute;left:12px;right:12px;bottom:12px;padding:10px 11px;border-radius:9px;background:#123b30e8;color:#fff;display:flex;flex-direction:column;gap:2px}.product-caption span{font-size:10px;color:#b8eacb;text-transform:uppercase;letter-spacing:.06em;font-weight:800}.product-caption strong{font-size:12px}.business-context+.scenario-section{margin-top:18px}
    .trade-control-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(300px,.75fr);gap:16px;margin:0 0 18px}.passport-panel{overflow:hidden;border:1px solid #c9ded2;border-radius:16px;background:#fff;box-shadow:0 2px 9px #123b3012}.panel-eyebrow{padding:14px 18px 0;color:#08753c;font-size:10px;font-weight:900;letter-spacing:.1em}.passport-layout{display:grid;grid-template-columns:minmax(250px,.85fr) minmax(300px,1.15fr);min-height:330px}.passport-jar-stage{position:relative;overflow:hidden;background:#dcebe3}.passport-jar-stage img{width:100%;height:100%;object-fit:cover;object-position:center;display:block}.passport-label-overlay{position:absolute;right:17%;top:52%;width:128px;padding:12px 10px;display:flex;flex-direction:column;gap:4px;align-items:center;text-align:center;border:1px solid #d8b363;border-radius:5px;background:linear-gradient(145deg,#163e31,#0e2d24);color:#fff;box-shadow:0 4px 12px #051f1640;transform:rotate(-2deg)}.passport-label-overlay .brand-mark{font-family:Georgia,serif;font-size:11px;color:#f4d68d;letter-spacing:.1em}.passport-label-overlay strong{font-size:12px;letter-spacing:.06em;line-height:1.05}.passport-label-overlay strong span{font-size:7px;vertical-align:top;color:#f4d68d}.passport-label-overlay small{font-size:7px;letter-spacing:.08em;color:#b8eacb}.passport-copy{padding:20px 20px 16px;display:flex;flex-direction:column;justify-content:center}.passport-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:12px}.passport-heading h2{font-size:21px;margin:3px 0 0;line-height:1.1}.verified-pill,.compliance-status{border-radius:999px;padding:5px 8px;background:#d9f7e4;color:#08753c;font-size:9px;font-weight:900;white-space:nowrap}.passport-field{display:grid;grid-template-columns:1fr auto;gap:3px 10px;border-top:1px solid #deebe3;padding:10px 0}.passport-field>span{color:#456783;font-size:11px}.passport-field>strong,.passport-field>code{font-size:12px;color:#103b31;text-align:right}.passport-field>small{grid-column:1 / -1;color:#678;font-size:10px}.passport-field>b{font-size:9px;color:#08753c;align-self:center}.zkp-field strong{color:#5b2dab}.passport-footnote{margin-top:10px;color:#82958d;font-size:9px;line-height:1.35}.compliance-stack{display:flex;flex-direction:column;gap:10px}.compliance-card{display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:10px;min-height:96px;padding:14px 13px;border:1px solid #c9ded2;border-radius:12px;background:#fff;box-shadow:0 2px 7px #123b3010}.compliance-icon{width:29px;height:29px;display:grid;place-items:center;border-radius:9px;background:#d9f7e4;color:#08753c;font-weight:900;font-size:17px}.customs-compliance-card .compliance-icon{background:#dceeff;color:#0878d1}.clearance-compliance-card .compliance-icon{background:#fff0d8;color:#a56400}.compliance-copy{min-width:0}.compliance-copy span{display:block;color:#456783;font-size:9px;font-weight:900;letter-spacing:.08em}.compliance-copy strong{display:block;color:#103b31;font-size:13px;margin-top:3px}.compliance-copy small{display:block;color:#678;font-size:10px;line-height:1.3;margin-top:4px}.compliance-status{background:#eaf4ee}.customs-compliance-card .compliance-status{background:#e5f2ff;color:#0878d1}.clearance-compliance-card .compliance-status{background:#fff0d8;color:#a56400}.compliance-disclaimer{margin-top:auto;padding:8px 10px;color:#82958d;font-size:9px;line-height:1.35;border:1px dashed #b8cfc1;border-radius:8px;background:#f7fbf8}
    @media (max-width:900px){.business-context{grid-template-columns:1fr 1.1fr}.business-context-copy{grid-row:1 / span 2}.product-visual{border-left:0;border-top:1px solid #c9ded2}.trade-control-grid{grid-template-columns:1fr}.compliance-stack{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}.compliance-disclaimer{grid-column:1 / -1}}
    @media (max-width:620px){h1{font-size:30px}.hero{align-items:flex-start;flex-direction:column}.badge{font-size:22px}.scenario-banner,.panel-heading{align-items:flex-start;flex-direction:column}.scenario-actions{justify-content:flex-start}.grid,.runtime-agents,.kpis{grid-template-columns:1fr}.sequence-step{grid-template-columns:28px 1fr}.sequence-step em{grid-column:2}.panel table{display:block;overflow-x:auto;white-space:nowrap}.hero{min-height:390px}.hero-route{gap:5px}.business-context{grid-template-columns:1fr}.business-context-copy{grid-row:auto}.business-context-visual{min-height:190px}.product-visual{border-top:1px solid #c9ded2}.passport-layout{grid-template-columns:1fr}.passport-jar-stage{min-height:280px}.passport-label-overlay{right:19%;top:50%}.compliance-stack{grid-template-columns:1fr}}
  </style>`;
}

function renderFlowIcon(name: "hub" | "fingerprint" | "custody" | "mpi" | "customs" | "adversary" | "monitor"): string {
  const shapes: Record<typeof name, string> = {
    hub: `<path d="M10 30 24 16 38 30M24 16V8"/><circle cx="10" cy="30" r="4"/><circle cx="24" cy="8" r="4"/><circle cx="38" cy="30" r="4"/>`,
    fingerprint: `<path d="M24 39c-5 0-8-4-8-9v-5c0-5 3-9 8-9s8 4 8 9v4M12 28v-5c0-8 5-14 12-14s12 6 12 14v8M18 39c-3-2-5-5-5-10v-6c0-7 5-12 11-12s11 5 11 12v5M24 20c-3 0-5 2-5 5v6c0 3 2 5 5 5s5-2 5-5v-5"/>`,
    custody: `<path d="M10 10h22a4 4 0 0 1 4 4v23H14a4 4 0 0 1-4-4V10Z"/><path d="M14 37h22M18 17h13M18 23h13M18 29h9"/><path d="M10 10a4 4 0 0 1 4-4h22v31"/>`,
    mpi: `<path d="M8 18h28v21H8zM5 18l17-10 17 10M13 23v10M21 23v10M29 23v10M5 39h38"/><path d="M35 8v-4M32 5h6"/>`,
    customs: `<circle cx="22" cy="12" r="5"/><path d="M13 37v-9c0-6 4-10 9-10s9 4 9 10v9M10 37h24M34 24h7v10h-7zM36 22h3"/>`,
    adversary: `<path d="m24 6 18 33H6L24 6Z"/><path d="M24 17v10M24 33v1"/>`,
    monitor: `<path d="M4 24s7-11 20-11 20 11 20 11-7 11-20 11S4 24 4 24Z"/><circle cx="24" cy="24" r="6"/>`
  };
  return `<svg class="flow-svg flow-svg-${name}" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round">${shapes[name]}</svg>`;
}

function renderFlowStyles(): string {
  return `<style>
    .flow-diagram{overflow-x:auto;padding:24px 0 4px}
    .flow-track{display:grid;grid-template-columns:82px 12px minmax(240px,1.25fr) 12px minmax(235px,1.2fr) 12px 76px 12px 76px 12px 76px 12px 140px;align-items:center;min-width:1000px;gap:0}
    .flow-arrow{position:relative;width:12px;height:18px;color:transparent;font-size:0;text-align:center;line-height:1}
    .flow-arrow::before{content:"";position:absolute;left:0;top:7px;width:8px;height:4px;border-radius:4px;background:#0878d1}.flow-arrow::after{content:"";position:absolute;right:-1px;top:2px;border-left:8px solid #0878d1;border-top:7px solid transparent;border-bottom:7px solid transparent}
    .flow-node,.flow-group,.flow-decision{position:relative;border:1px solid #86c6fa;border-radius:11px;background:#fafdff;color:#103b61;min-height:174px;padding:31px 8px 10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;text-align:center;transition:.3s ease}
    .flow-group{background:#f0f7ff;border-color:#73b9f5;justify-content:flex-start}
    .flow-decision{min-height:174px;background:#fffaf3;border-color:#f4bd69;justify-content:flex-start}
    .flow-number{position:absolute;top:-28px;left:50%;transform:translateX(-50%);width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:#0878d1;color:#fff!important;font-size:17px;font-weight:900;box-shadow:0 2px 5px #0878d133}
    .flow-decision .flow-number{background:#f47721}
    .flow-icon{font-size:33px;line-height:1;color:#0878d1;font-weight:900}.flow-svg{display:block;width:48px;height:48px}.flow-svg-fingerprint{color:#0878d1}.flow-svg-custody{color:#008b74}.flow-svg-mpi{color:#5b2dab}.flow-svg-customs,.flow-svg-adversary,.flow-svg-monitor,.flow-svg-hub{color:#0878d1}
    .flow-node strong,.flow-group>strong,.flow-decision>strong{font-size:12px;line-height:1.12;word-break:break-word}
    .flow-title{font-size:12px;color:#456783}
    .flow-node em,.flow-group>em,.flow-decision>em{font-style:normal;margin-top:auto;border-radius:999px;background:#e6f3ff;color:#476d8d;padding:5px 10px;font-size:10px;font-weight:900}
    .flow-node.running,.flow-group.running,.flow-decision.running{border-color:#1ca6ff;background:#eaf7ff;box-shadow:0 0 0 4px #43b9ff2b;transform:translateY(-3px)}
    .flow-node.running .flow-number,.flow-group.running .flow-number{background:#11a8e8}
    .flow-node.running em,.flow-group.running>em,.flow-decision.running>em{background:#d8f5ff;color:#0878d1}
    .flow-node.completed,.flow-group.completed,.flow-decision.completed{border-color:#72c795;background:#f0fff4}
    .flow-node.completed em,.flow-group.completed>em,.flow-decision.completed>em{background:#d9f7e4;color:#08753c}
    .flow-agent-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;width:100%;margin-top:4px}
    .flow-agent{min-height:96px;border:1px solid #a9d7f7;border-radius:8px;background:#fff;padding:6px 3px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;transition:.25s ease}
    .flow-agent-icon{font-size:24px;line-height:1;color:#0878d1;font-weight:900}.flow-agent-icon .flow-svg{width:38px;height:38px}.flow-agent b{font-size:10px;line-height:1.05;word-break:break-word}.flow-agent small{font-size:9px;line-height:1.05;color:#456783}.flow-agent i{font-style:normal;font-size:9px;font-weight:900;color:#60776d;margin-top:auto}.flow-agent.running{border-color:#11a8e8;background:#eaf7ff;box-shadow:0 0 0 2px #43b9ff2b}.flow-agent.running i{color:#0878d1}.flow-agent.pass{border-color:#72c795;background:#effff3}.flow-agent.pass i{color:#08753c}.flow-agent.blocked{border-color:#e89186;background:#fff3f1}.flow-agent.blocked i{color:#b42318}
    .flow-note{font-size:10px;color:#456783;background:#fff;border-radius:999px;padding:4px 8px;margin-top:5px}
    .decision-options{display:flex;flex-direction:column;gap:5px;width:100%;margin-top:8px}.decision-option{display:block;border:1px solid;border-radius:8px;padding:6px 7px;font-size:12px;text-align:left}.release-option{color:#08753c;background:#dcf8e5;border-color:#72c795}.review-option{color:#9b5e00;background:#fff2d3;border-color:#f0c66d}.blocked-option{color:#b42318;background:#ffe3df;border-color:#e89186}.flow-decision-result{font-size:10px;color:#456783;margin-top:6px}.flow-decision-result b{color:#103b61}
    .flow-timeline{display:flex;align-items:flex-start;justify-content:space-between;gap:4px;min-width:1000px;margin:36px 0 22px;border-top:2px solid #80b5e0;padding-top:0}.flow-timeline>i{position:relative;width:14px;height:18px;color:transparent;font-size:0;margin-top:-13px}.flow-timeline>i::before{content:"";position:absolute;left:0;top:7px;width:8px;height:3px;border-radius:3px;background:#5c8ebd}.flow-timeline>i::after{content:"";position:absolute;right:0;top:3px;border-left:7px solid #5c8ebd;border-top:5px solid transparent;border-bottom:5px solid transparent}.flow-timeline-step{display:flex;flex:1;min-width:60px;align-items:center;flex-direction:column;text-align:center;color:#274f76;font-size:11px}.flow-timeline-step b{width:30px;height:30px;margin-top:-16px;display:grid;place-items:center;border-radius:50%;background:#0878d1;color:#fff!important;font-size:15px;box-shadow:0 0 0 4px #fff}.flow-timeline-step:last-child b{background:#f47721}.flow-timeline-step span{margin-top:7px}
    .flow-bands{display:grid;grid-template-columns:1fr 1.7fr 2.5fr 1.1fr;min-width:1000px;gap:4px;margin:6px -2px 0}.flow-band{min-height:58px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#155181;padding:8px 22px;background:#d9efff;clip-path:polygon(0 0,calc(100% - 18px) 0,100% 50%,calc(100% - 18px) 100%,0 100%,18px 50%)}.flow-band strong{font-size:14px}.flow-band span{font-size:11px}.parallel-band{background:#d8f7ed}.sequential-band{background:#d8edff}.decision-band{background:#fff0dc;color:#8b521b}
    .scenario-switcher{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:18px 0}.scenario-switch-button{appearance:none;border:1px solid #b8d9c7;border-radius:12px;background:#fff;text-align:left;color:#123b30;padding:14px 16px;display:flex;flex-direction:column;align-items:flex-start;gap:4px;cursor:pointer;transition:.2s ease}.scenario-switch-button:hover,.scenario-switch-button:focus-visible{transform:translateY(-2px);box-shadow:0 4px 12px #123b3020;outline:none}.scenario-switch-button .scenario-switch-kicker{font-size:10px;font-weight:900;letter-spacing:.08em;color:#08753c}.scenario-switch-button strong{font-size:18px}.scenario-switch-button small{font-size:13px;line-height:1.35;color:#456783;max-width:640px}.scenario-switch-button em{font-style:normal;margin-top:5px;font-size:12px;font-weight:800;color:#08753c}.scenario-a-switch{border-left:5px solid #2cbf72;background:#f3fff7}.scenario-b-switch{border-left:5px solid #d84032;background:#fff8f6}.scenario-b-switch .scenario-switch-kicker,.scenario-b-switch em{color:#b42318}
    .blue-evidence-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);align-items:stretch;gap:0;border-top:1px solid #deebe3}.blue-evidence-grid>.panel,.blue-decision-column{min-width:0}.blue-decision-column{display:flex;flex-direction:column}.blue-decision-column>.panel+.panel{border-top:1px solid #deebe3}.blue-evidence-grid .grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.skill-panel-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.skill-panel-heading .panel-intro{margin-bottom:14px}.skill-panel-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.skill-panel-actions .primary,.skill-panel-actions .secondary{padding:7px 9px;font-size:12px;white-space:nowrap}.light-button{border-color:#79b995;background:#f4fbf6;color:#123b30}.light-button:hover{background:#d9f7e4}.blue-evidence-grid .runtime-panel{border-top:0;border-left:1px solid #deebe3;border-right:0}.blue-evidence-grid .runtime-agents{grid-template-columns:repeat(2,minmax(0,1fr))}.blue-evidence-grid .runtime-timeline{max-height:460px;overflow:auto;padding-right:5px}.blue-evidence-grid .skill-card{min-height:170px}
    @media (max-width:900px){.blue-evidence-grid{grid-template-columns:1fr}.blue-evidence-grid .runtime-panel{border-right:0;border-top:1px solid #deebe3}.blue-decision-column{display:block}}
    @media (max-width:620px){.flow-diagram{margin-right:-8px}.flow-track{min-width:1000px}.flow-timeline,.flow-bands{min-width:1000px}.scenario-switcher{grid-template-columns:1fr}.skill-panel-heading{flex-direction:column}.skill-panel-actions{justify-content:flex-start}.blue-evidence-grid .grid,.blue-evidence-grid .runtime-agents{grid-template-columns:1fr}}
  </style>`;
}

function renderClientScript(input: { incidentData: string; skillData: string; baselineDecision: string; firstSkill: SkillName; workflowOrder: string }): string {
  return `
const incidentData=${input.incidentData};
const skillData=${input.skillData};
const baselineDecision=${JSON.stringify(input.baselineDecision)};
const workflowOrder=${input.workflowOrder};
const firstSkill=${JSON.stringify(input.firstSkill)};
const completedSkills=new Set();
let demoRunning=false;

function esc(value){return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');}
function setStatus(value){
  const badge=document.getElementById('decision-badge');
  badge.textContent=value;
  badge.className='badge '+String(value).toLowerCase();
}
function setDemoText(value){document.getElementById('demo-status').textContent=value;}
function wait(ms){return new Promise(function(resolve){window.setTimeout(resolve,ms);});}
function resetCards(){
  document.querySelectorAll('.skill-card').forEach(function(card){card.classList.remove('selected');});
  document.querySelectorAll('.skill-status').forEach(function(status){status.textContent='PENDING';status.className='skill-status pending';});
  document.getElementById('skill-inspector').innerHTML='<strong>Select a skill card</strong><span>Its output and evidence references will appear here after the run.</span>';
}
function resetSequence(){
  document.querySelectorAll('.sequence-step').forEach(function(step){step.classList.remove('running','completed');step.classList.add('pending');step.querySelector('em').textContent='PENDING';});
  document.querySelectorAll('.flow-agent').forEach(function(agent){agent.classList.remove('running','pass','blocked');const state=agent.querySelector('i');if(state)state.textContent='PENDING';});
  document.getElementById('sequence-decision').textContent='RELEASE / REVIEW / BLOCKED';
}
function clearRuntime(){
  document.getElementById('runtime-timeline').innerHTML='<li class="timeline-empty">No Scenario A runtime events yet. Click Run Scenario A to start.</li>';
  document.querySelectorAll('.runtime-agent').forEach(function(agent){agent.className='runtime-agent';agent.querySelector('.runtime-agent-status').textContent='PENDING';});
}
function clearRedTimeline(){document.getElementById('red-timeline').innerHTML='<li class="timeline-empty">No Scenario B replay yet. Select Inject fault above.</li>';}
function setSequenceStep(index,state){
  const step=document.getElementById('sequence-step-'+index);
  step.classList.remove('pending','running','completed');
  step.classList.add(state);
  step.querySelector('em').textContent=state.toUpperCase();
}
function appendRuntimeEvent(type,skill,status,attempt){
  const list=document.getElementById('runtime-timeline');
  const empty=list.querySelector('.timeline-empty');
  if(empty)empty.remove();
  const item=document.createElement('li');
  item.innerHTML='<code>'+esc(type)+'</code> <strong>'+esc(skill)+'</strong> · attempt '+attempt+' · <span class="'+String(status).toLowerCase()+'">'+esc(status)+'</span>';
  list.appendChild(item);
  item.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function updateRuntimeAgent(skill,state){
  const agent=document.getElementById('runtime-agent-'+skill);
  if(!agent)return;
  agent.className='runtime-agent '+String(state).toLowerCase();
  agent.querySelector('.runtime-agent-status').textContent=state;
}
function updateFlowAgent(skill,state,completed){
  const agent=document.getElementById((completed?'flow-complete-':'flow-agent-')+skill);
  if(!agent)return;
  agent.classList.remove('running','pass','blocked');
  agent.classList.add(String(state).toLowerCase());
  const label=agent.querySelector('i');
  if(label)label.textContent=state;
}
function markSkill(skill,status){
  completedSkills.add(skill);
  const badge=document.getElementById('skill-status-'+skill);
  if(badge){badge.textContent=status;badge.className='skill-status '+String(status).toLowerCase();}
  const card=document.getElementById('skill-node-'+skill);
  if(card)card.classList.add('selected');
}
function showSkill(skill){
  const item=skillData.find(function(record){return record.skill===skill;});
  if(!item)return;
  document.querySelectorAll('.skill-card').forEach(function(card){card.classList.toggle('selected',card.dataset.skill===skill);});
  const inspector=document.getElementById('skill-inspector');
  const details=item.details.map(function(detail){return '<span>'+esc(detail.label)+': <strong>'+esc(detail.value)+'</strong></span>';}).join('');
  const refs=item.evidenceRefs.map(function(ref){return '<code>'+esc(ref)+'</code>';}).join(' ');
  inspector.innerHTML='<strong>'+esc(item.skill)+' · '+esc(item.status)+'</strong>'+details+'<span>Evidence: '+(refs||'none')+'</span>';
}
async function runOne(skill){
  const isRoot=workflowOrder.slice(0,3).indexOf(skill)!==-1;
  if(isRoot)updateFlowAgent(skill,'RUNNING',false);
  updateRuntimeAgent(skill,'RUNNING');
  appendRuntimeEvent('TASK_STARTED',skill,'RUNNING',1);
  await wait(650);
  const record=skillData.find(function(item){return item.skill===skill;});
  const status=record && record.status==='BLOCKED'?'BLOCKED':'PASS';
  if(isRoot){updateFlowAgent(skill,status,false);updateFlowAgent(skill,status,true);}
  markSkill(skill,status);
  updateRuntimeAgent(skill,status);
  appendRuntimeEvent('TASK_COMPLETED',skill,status,1);
  showSkill(skill);
}
async function runReleaseDemo(){
  if(demoRunning)return;
  demoRunning=true;
  document.getElementById('skill-cards').scrollIntoView({behavior:'smooth',block:'start'});
  completedSkills.clear();resetCards();clearRuntime();clearRedTimeline();resetSequence();restoreBaseline(false);
  setStatus('RUNNING');setSequenceStep(1,'running');setDemoText('Scenario A running · orchestration-hub is creating the DAG.');
  await wait(600);
  setSequenceStep(1,'completed');setSequenceStep(2,'running');setDemoText('Scenario A · three root agents are running in parallel.');
  const roots=workflowOrder.slice(0,3);
  await Promise.all(roots.map(function(skill){return runOne(skill);}));
  setSequenceStep(2,'completed');setSequenceStep(3,'running');setDemoText('Scenario A · all three root agents completed.');
  await wait(450);setSequenceStep(3,'completed');
  setSequenceStep(4,'running');setDemoText('Scenario A · customs-clearance is preparing the export drafts.');
  await runOne(workflowOrder[3]);setSequenceStep(4,'completed');
  setSequenceStep(5,'running');setDemoText('Scenario A · trade-risk-adversary is checking the negative path.');
  await runOne(workflowOrder[4]);setSequenceStep(5,'completed');
  setSequenceStep(6,'running');setDemoText('Scenario A · evidence-monitor is applying the release gates.');
  await runOne(workflowOrder[5]);setSequenceStep(6,'completed');
  setSequenceStep(7,'running');setStatus(baselineDecision);document.getElementById('score').textContent=incidentData.baseline.score;document.getElementById('sequence-decision').textContent=baselineDecision;
  setDemoText('Scenario A complete · evidence-monitor returned '+baselineDecision+' ('+incidentData.baseline.score+'/100).');
  await wait(500);setSequenceStep(7,'completed');demoRunning=false;
  document.getElementById('skill-cards').scrollIntoView({behavior:'smooth',block:'start'});
}
function jumpToExecutionSequence(){
  const element=document.getElementById('execution-sequence');
  if(element)element.scrollIntoView({behavior:'smooth',block:'start'});
}
function jumpToScenario(target){
  document.querySelectorAll('.scenario-switch-button').forEach(function(button){button.classList.toggle('active',button.dataset.target===target);});
  const element=document.getElementById(target);
  if(element)element.scrollIntoView({behavior:'smooth',block:'start'});
}
function jumpToStage(target){
  document.querySelectorAll('.stage-button').forEach(function(button){button.classList.toggle('active',button.dataset.target===target);});
  const element=document.getElementById(target);if(element)element.scrollIntoView({behavior:'smooth',block:'start'});
}
function appendRedEvent(label,detail){
  const list=document.getElementById('red-timeline');const empty=list.querySelector('.timeline-empty');if(empty)empty.remove();
  const item=document.createElement('li');item.innerHTML='<strong>'+esc(label)+'</strong><br><span>'+esc(detail)+'</span>';list.appendChild(item);
}
function selectIncident(fault){
  const scenario=incidentData.redTeam.find(function(item){return item.fault===fault;});if(!scenario)return;
  setStatus('BLOCKED');document.getElementById('score').textContent='0';document.getElementById('incident-badge').textContent='BLOCKED';document.getElementById('incident-badge').className='scenario-badge red-blocked';
  document.getElementById('incident-flow').innerHTML='<span>FAULT INJECTED</span><b>→</b><span>DOWNSTREAM CHECKS</span><b>→</b><strong>RELEASE HALTED</strong>';
  document.querySelectorAll('.fault-row').forEach(function(row){row.classList.toggle('active',row.dataset.fault===fault);});
  document.querySelectorAll('[id^="fault-decision-"]').forEach(function(cell){cell.textContent='READY';cell.className='fault-state ready';});
  const decisionCell=document.getElementById('fault-decision-'+fault);decisionCell.textContent='BLOCKED';decisionCell.className='fault-state blocked';
  clearRedTimeline();
  appendRedEvent('RED_TEAM_FAULT_INJECTED','Replay selected: '+fault+'.');
  appendRedEvent('MUTATED_CASE_CREATED',scenario.findings[0] && scenario.findings[0].observed || 'A controlled mutation was applied to the cloned case.');
  appendRedEvent('DOWNSTREAM_CHECK_STARTED','Dependent evidence checks re-ran against the mutated case.');
  appendRedEvent('EVIDENCE_MONITOR_BLOCKED','Evidence monitor rejected the case at the release gate.');
  appendRedEvent('RELEASE_HALTED','Customs clearance and warehouse release are halted.');
  appendRedEvent('BASELINE_PRESERVED','The original RELEASE case remains unchanged.');
  setDemoText('Scenario B blocked · '+fault+' detected. Baseline RELEASE preserved.');
  document.getElementById('incident-room').scrollIntoView({behavior:'smooth',block:'center'});
}
function restoreBaseline(scroll){
  setStatus(baselineDecision);document.getElementById('score').textContent=incidentData.baseline.score;document.getElementById('incident-badge').textContent='READY';document.getElementById('incident-badge').className='scenario-badge red-ready';
  document.getElementById('incident-flow').innerHTML='<span>BASELINE RELEASE</span><b>→</b><span>READY FOR REPLAY</span>';
  document.querySelectorAll('.fault-row').forEach(function(row){row.classList.remove('active');});
  document.querySelectorAll('[id^="fault-decision-"]').forEach(function(cell){cell.textContent='READY';cell.className='fault-state ready';});
  clearRedTimeline();
  if(scroll!==false)document.getElementById('scenario-b').scrollIntoView({behavior:'smooth',block:'center'});
}
function resetDemo(){
  if(demoRunning)return;
  completedSkills.clear();resetCards();clearRuntime();clearRedTimeline();resetSequence();
  document.querySelectorAll('.stage-button').forEach(function(button){button.classList.remove('active');});
  restoreBaseline(false);setStatus(baselineDecision);setDemoText('No scenario has run yet. Start Scenario A or inject a Scenario B fault.');showSkill(firstSkill);
}
showSkill(firstSkill);
`;
}

function buildSkillRecords(run: WorkflowRun): Array<{ skill: SkillName; status: string; details: Array<{ label: string; value: string }>; evidenceRefs: string[] }> {
  const fingerprint = run.tradeCase.fingerprint;
  const custody = run.tradeCase.custody;
  const mpi = run.tradeCase.mpi;
  const customs = run.tradeCase.customs;
  const adversary = run.tradeCase.adversary;
  return [
    { skill: "fingerprint-evidence", status: fingerprint?.status ?? "PENDING", details: [{ label: "Similarity", value: fingerprint ? `${fingerprint.similarity}%` : "pending" }, { label: "Confidence", value: fingerprint ? `${fingerprint.confidence}%` : "pending" }, { label: "Anomalies", value: String(fingerprint?.anomalies.length ?? 0) }], evidenceRefs: fingerprint?.evidenceRefs ?? [] },
    { skill: "custody-ledger", status: custody?.status ?? "PENDING", details: [{ label: "Events checked", value: String(custody?.events.length ?? 0) }, { label: "Head hash", value: custody ? `${custody.headHash.slice(0, 18)}…` : "pending" }, { label: "Tampered events", value: String(custody?.tamperedEventIds.length ?? 0) }], evidenceRefs: custody?.evidenceRefs ?? [] },
    { skill: "mpi-market-access", status: mpi?.status ?? "PENDING", details: [{ label: "Destination", value: mpi?.destination ?? "pending" }, { label: "Rule version", value: mpi?.ruleVersion ?? "pending" }, { label: "Checks passed", value: mpi ? `${mpi.checks.filter((check) => check.passed).length}/${mpi.checks.length}` : "pending" }], evidenceRefs: mpi?.evidenceRefs ?? [] },
    { skill: "customs-clearance", status: customs?.status ?? "PENDING", details: [{ label: "HS candidates", value: String(customs?.hsCandidates.length ?? 0) }, { label: "Landed value", value: customs ? `NZD ${customs.totals.estimatedLandedValueNzd.toFixed(2)}` : "pending" }, { label: "Draft documents", value: String(customs?.documents.length ?? 0) }], evidenceRefs: customs?.evidenceRefs ?? [] },
    { skill: "trade-risk-adversary", status: adversary?.status ?? "PENDING", details: [{ label: "Faults tested", value: String(run.redTeam.length) }, { label: "Active faults", value: String(adversary?.activeFaults.length ?? 0) }, { label: "Baseline finding", value: adversary?.findings[0]?.observed ?? "No active finding" }], evidenceRefs: adversary?.evidenceRefs ?? [] },
    { skill: "evidence-monitor", status: run.baseline.decision === "RELEASE" ? "PASS" : run.baseline.decision, details: [{ label: "Decision", value: run.baseline.decision }, { label: "Gates", value: `${run.baseline.gates.length}` }, { label: "Next action", value: run.baseline.nextActions[0] ?? "none" }], evidenceRefs: run.baseline.gates.flatMap((gate) => gate.evidenceRefs) }
  ];
}

function escapeHtml(value: unknown): string {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function escapeJs(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}
